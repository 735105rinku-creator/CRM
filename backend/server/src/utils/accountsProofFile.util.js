import fs from "node:fs/promises";
import path from "node:path";


function normalizePublicFileUrl(
  fileUrl
) {

  return String(
    fileUrl ||
    ""
  )
    .trim()
    .replace(
      /\\/g,
      "/"
    );
}


export async function safeRemoveAccountsProofFile(
  fileUrl,
  options = {}
) {

  const normalized =
    normalizePublicFileUrl(
      fileUrl
    );

  if (!normalized) {
    return false;
  }


  const expectedPrefix =
    "/uploads/accounts-proofs/";

  if (
    !normalized.startsWith(
      expectedPrefix
    )
  ) {

    throw new Error(
      "Unsafe Accounts proof path."
    );
  }


  const relativeName =
    normalized.slice(
      expectedPrefix.length
    );

  if (
    !relativeName ||
    relativeName.includes("/") ||
    relativeName.includes("\\") ||
    relativeName === "." ||
    relativeName === ".."
  ) {

    throw new Error(
      "Unsafe Accounts proof path."
    );
  }


  const uploadRoot =
    options.uploadRoot
      ? path.resolve(
          options.uploadRoot
        )
      : path.resolve(
          process.cwd(),
          "public",
          "uploads"
        );


  const accountsProofRoot =
    path.resolve(
      uploadRoot,
      "accounts-proofs"
    );


  const target =
    path.resolve(
      accountsProofRoot,
      relativeName
    );


  const prefix =
    accountsProofRoot.endsWith(
      path.sep
    )
      ? accountsProofRoot
      : accountsProofRoot +
        path.sep;


  if (
    target !== accountsProofRoot &&
    !target.startsWith(
      prefix
    )
  ) {

    throw new Error(
      "Accounts proof path is outside the allowed folder."
    );
  }


  try {

    await fs.unlink(
      target
    );

    return true;

  } catch (
    error
  ) {

    if (
      error?.code ===
      "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}
