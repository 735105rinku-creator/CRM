import { Injectable } from '@angular/core';

export interface ImageCropOptions {
  title?: string;
  outputSize?: number;
  mimeType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageCropperService {
  private readonly styleId = 'app-image-cropper-styles';

  async cropImage(file: File, options: ImageCropOptions = {}): Promise<File | null> {
    if (!file.type.startsWith('image/')) {
      return null;
    }

    this.ensureStyles();

    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = await this.loadImage(sourceUrl);
      return await this.openCropDialog(file, image, options);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  private loadImage(sourceUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to load selected image.'));
      image.src = sourceUrl;
    });
  }

  private openCropDialog(file: File, image: HTMLImageElement, options: ImageCropOptions): Promise<File | null> {
    return new Promise((resolve) => {
      const cropSize = 360;
      const outputSize = options.outputSize ?? 512;
      const mimeType = options.mimeType || this.outputMimeType(file.type);
      const baseScale = Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight);
      let zoom = 1;
      let offsetX = (cropSize - image.naturalWidth * baseScale) / 2;
      let offsetY = (cropSize - image.naturalHeight * baseScale) / 2;
      let isDragging = false;
      let lastX = 0;
      let lastY = 0;

      const overlay = document.createElement('div');
      overlay.className = 'image-cropper-overlay';

      const dialog = document.createElement('section');
      dialog.className = 'image-cropper-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', options.title || 'Crop image');

      const header = document.createElement('header');
      const title = document.createElement('strong');
      title.textContent = options.title || 'Crop image';
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'image-cropper-icon-btn';
      closeButton.setAttribute('aria-label', 'Close cropper');
      closeButton.textContent = 'X';
      header.append(title, closeButton);

      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'image-cropper-canvas-wrap';
      const canvas = document.createElement('canvas');
      canvas.width = cropSize;
      canvas.height = cropSize;
      canvasWrap.append(canvas);

      const controls = document.createElement('label');
      controls.className = 'image-cropper-zoom';
      const zoomLabel = document.createElement('span');
      zoomLabel.textContent = 'Zoom';
      const range = document.createElement('input');
      range.type = 'range';
      range.min = '1';
      range.max = '4';
      range.step = '0.01';
      range.value = '1';
      controls.append(zoomLabel, range);

      const actions = document.createElement('footer');
      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'image-cropper-secondary';
      cancelButton.textContent = 'Cancel';
      const cropButton = document.createElement('button');
      cropButton.type = 'button';
      cropButton.className = 'image-cropper-primary';
      cropButton.textContent = 'Crop & use';
      actions.append(cancelButton, cropButton);

      dialog.append(header, canvasWrap, controls, actions);
      overlay.append(dialog);
      document.body.append(overlay);
      document.body.classList.add('image-cropper-open');

      const context = canvas.getContext('2d');

      const cleanup = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        overlay.remove();
        document.body.classList.remove('image-cropper-open');
      };

      const finish = (result: File | null) => {
        cleanup();
        resolve(result);
      };

      const clampOffsets = () => {
        const scale = baseScale * zoom;
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;

        offsetX = drawWidth <= cropSize
          ? (cropSize - drawWidth) / 2
          : Math.min(0, Math.max(cropSize - drawWidth, offsetX));
        offsetY = drawHeight <= cropSize
          ? (cropSize - drawHeight) / 2
          : Math.min(0, Math.max(cropSize - drawHeight, offsetY));
      };

      const draw = () => {
        if (!context) return;

        const scale = baseScale * zoom;
        clampOffsets();
        context.clearRect(0, 0, cropSize, cropSize);
        context.save();
        context.fillStyle = '#f8fafc';
        context.fillRect(0, 0, cropSize, cropSize);
        context.drawImage(
          image,
          offsetX,
          offsetY,
          image.naturalWidth * scale,
          image.naturalHeight * scale
        );
        context.restore();
      };

      const onPointerDown = (event: PointerEvent) => {
        isDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!isDragging) return;
        offsetX += event.clientX - lastX;
        offsetY += event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        draw();
      };

      const onPointerUp = () => {
        isDragging = false;
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          finish(null);
        }
      };

      range.addEventListener('input', () => {
        const nextZoom = Number(range.value);
        const oldScale = baseScale * zoom;
        const nextScale = baseScale * nextZoom;
        const centerSourceX = (cropSize / 2 - offsetX) / oldScale;
        const centerSourceY = (cropSize / 2 - offsetY) / oldScale;
        zoom = nextZoom;
        offsetX = cropSize / 2 - centerSourceX * nextScale;
        offsetY = cropSize / 2 - centerSourceY * nextScale;
        draw();
      });

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('keydown', onKeyDown);
      closeButton.addEventListener('click', () => finish(null));
      cancelButton.addEventListener('click', () => finish(null));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          finish(null);
        }
      });
      cropButton.addEventListener('click', async () => {
        const croppedFile = await this.createCroppedFile(file, image, {
          cropSize,
          outputSize,
          baseScale,
          zoom,
          offsetX,
          offsetY,
          mimeType
        });
        finish(croppedFile);
      });

      draw();
      cropButton.focus();
    });
  }

  private async createCroppedFile(
    originalFile: File,
    image: HTMLImageElement,
    params: {
      cropSize: number;
      outputSize: number;
      baseScale: number;
      zoom: number;
      offsetX: number;
      offsetY: number;
      mimeType: string;
    }
  ): Promise<File> {
    const scale = params.baseScale * params.zoom;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = params.outputSize;
    outputCanvas.height = params.outputSize;
    const outputContext = outputCanvas.getContext('2d');

    if (!outputContext) {
      return originalFile;
    }

    const sourceX = Math.max(0, -params.offsetX / scale);
    const sourceY = Math.max(0, -params.offsetY / scale);
    const sourceSize = params.cropSize / scale;

    if (params.mimeType === 'image/jpeg') {
      outputContext.fillStyle = '#ffffff';
      outputContext.fillRect(0, 0, params.outputSize, params.outputSize);
    }

    outputContext.drawImage(
      image,
      sourceX,
      sourceY,
      Math.min(sourceSize, image.naturalWidth - sourceX),
      Math.min(sourceSize, image.naturalHeight - sourceY),
      0,
      0,
      params.outputSize,
      params.outputSize
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      outputCanvas.toBlob(resolve, params.mimeType, 0.92);
    });

    if (!blob) {
      return originalFile;
    }

    return new File([blob], originalFile.name, {
      type: blob.type || params.mimeType,
      lastModified: Date.now()
    });
  }

  private outputMimeType(inputType: string): string {
    if (['image/png', 'image/webp', 'image/jpeg'].includes(inputType)) {
      return inputType;
    }

    return 'image/jpeg';
  }

  private ensureStyles(): void {
    if (document.getElementById(this.styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = this.styleId;
    style.textContent = `
      body.image-cropper-open { overflow: hidden; }
      .image-cropper-overlay {
        align-items: center;
        background: rgba(15, 23, 42, 0.62);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 18px;
        position: fixed;
        z-index: 10000;
      }
      .image-cropper-dialog {
        background: #ffffff;
        border: 1px solid #dbe3ee;
        border-radius: 12px;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
        color: #0f172a;
        display: grid;
        gap: 16px;
        max-width: min(440px, 100%);
        padding: 18px;
        width: 440px;
      }
      .image-cropper-dialog header,
      .image-cropper-dialog footer {
        align-items: center;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .image-cropper-dialog strong { font-size: 1rem; font-weight: 900; }
      .image-cropper-icon-btn,
      .image-cropper-secondary,
      .image-cropper-primary {
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 800;
        min-height: 38px;
        padding: 0 14px;
      }
      .image-cropper-icon-btn {
        background: #eef2f7;
        color: #334155;
        min-width: 38px;
        padding: 0;
      }
      .image-cropper-secondary { background: #eef2f7; color: #334155; }
      .image-cropper-primary { background: #0f766e; color: #ffffff; }
      .image-cropper-canvas-wrap {
        background-color: #e2e8f0;
        background-image:
          linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
          linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
          linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
        background-position: 0 0, 0 8px, 8px -8px, -8px 0;
        background-size: 16px 16px;
        border-radius: 10px;
        display: grid;
        justify-content: center;
        overflow: hidden;
      }
      .image-cropper-canvas-wrap canvas {
        aspect-ratio: 1;
        cursor: move;
        display: block;
        max-width: 100%;
        touch-action: none;
        width: 360px;
      }
      .image-cropper-zoom {
        color: #475569;
        display: grid;
        gap: 8px;
        font-size: 0.85rem;
        font-weight: 800;
      }
      .image-cropper-zoom input { width: 100%; }
      @media (max-width: 480px) {
        .image-cropper-dialog { padding: 14px; }
        .image-cropper-dialog footer { display: grid; grid-template-columns: 1fr 1fr; }
      }
    `;
    document.head.append(style);
  }
}
