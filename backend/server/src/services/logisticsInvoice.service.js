import mongoose from "mongoose";
import repo from "../repositories/logisticsInvoice.repository.js";
import { ApiError } from "../utils/apiError.js";
class LogisticsInvoiceService {
  assertId(id){ if(!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400,"Invalid invoice ID"); }
  async number(companyId){ const d=new Date(); const code=`${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; const prefix=`LINV-${code}-`; const last=await repo.findLatest({companyId,prefix}); const n=last?.invoiceNumber?Number(last.invoiceNumber.split("-").pop())+1:1; return `${prefix}${String(n).padStart(4,"0")}`; }
  calculate(payload){
    const items=(payload.items||[]).map(i=>{const base=Number(i.quantity||0)*Number(i.rate||0);const discount=Math.min(base,Number(i.discount||0));const taxable=Math.max(0,base-discount);const tax=taxable*Number(i.gstRate||0)/100;return {...i,baseAmount:base,taxableAmount:taxable,taxAmount:tax,total:taxable+tax};});
    const charges=(payload.additionalCharges||[]).map(c=>({...c,amount:Number(c.amount||0)}));
    const itemsSubtotal=items.reduce((s,i)=>s+i.taxableAmount,0), chargeSubtotal=charges.reduce((s,c)=>s+c.amount,0), itemTax=items.reduce((s,i)=>s+i.taxAmount,0), chargeTax=charges.reduce((s,c)=>s+(c.taxable?c.amount*.18:0),0);
    const subtotal=itemsSubtotal+chargeSubtotal; const raw=Number(payload.overallDiscount||0); const disc=payload.discountType==="percentage"?Math.min(subtotal,subtotal*raw/100):Math.min(subtotal,raw); const taxableAmount=Math.max(0,subtotal-disc); const taxTotal=itemTax+chargeTax; const invoiceTotal=Math.max(0,taxableAmount+taxTotal+Number(payload.roundOff||0)); const received=Number(payload.amountReceived||0); if(received>invoiceTotal) throw new ApiError(400,"Amount Received cannot exceed Invoice Total");
    let paymentStatus=payload.paymentStatus||"unpaid"; if(paymentStatus!=="cancelled"&&paymentStatus!=="other"){paymentStatus=received<=0?"unpaid":received>=invoiceTotal?"paid":"partial";}
    return {...payload,items,additionalCharges:charges,itemsSubtotal,additionalChargeSubtotal:chargeSubtotal,overallDiscountAmount:disc,taxableAmount,taxTotal,invoiceTotal,amountReceived:received,balanceDue:Math.max(0,invoiceTotal-received),paymentStatus};
  }
  async create({companyId,userId,employeeId,payload}){ const data=this.calculate(payload); if(data.status==="issued"&&!data.items.length) throw new ApiError(400,"At least one invoice item is required"); return repo.create({...data,companyId,invoiceNumber:await this.number(companyId),createdBy:userId,createdByEmployeeId:employeeId,updatedBy:userId}); }
  async list({companyId,query}){ return repo.paginate({companyId,...query}); }
  async get({companyId,invoiceId}){ this.assertId(invoiceId); const x=await repo.findById({companyId,invoiceId}); if(!x) throw new ApiError(404,"Logistics invoice not found"); return x; }
  async update({companyId,invoiceId,userId,payload}){ const old=await this.get({companyId,invoiceId}); const data=this.calculate({...old,...payload,items:payload.items||old.items,additionalCharges:payload.additionalCharges||old.additionalCharges}); const x=await repo.update({companyId,invoiceId,payload:{...data,updatedBy:userId,_id:undefined,companyId:undefined,invoiceNumber:undefined,createdAt:undefined,createdBy:undefined}}); if(!x) throw new ApiError(404,"Logistics invoice not found"); return x; }
  async remove({companyId,invoiceId,userId}){ await this.get({companyId,invoiceId}); return repo.softDelete({companyId,invoiceId,userId}); }
  async summary(companyId){ const [x]=await repo.summary(new mongoose.Types.ObjectId(String(companyId))); return x||{totalInvoices:0,totalBilled:0,totalReceived:0,totalOutstanding:0,draft:0,issued:0}; }
}
export default new LogisticsInvoiceService();
