import LogisticsInvoice from "../models/LogisticsInvoice.js";

const esc=v=>String(v||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

class LogisticsInvoiceRepository {
  create(payload){ return LogisticsInvoice.create(payload); 
  }

  findById({companyId,invoiceId})
  { return LogisticsInvoice.findOne({_id:invoiceId,companyId,isActive:{ $ne:false }}).lean(); 
}
  findLatest({companyId,prefix}){ return LogisticsInvoice.findOne({companyId,invoiceNumber:{$regex:new RegExp(`^${prefix}`,"i")}}).sort({invoiceNumber:-1}).select("invoiceNumber").lean(); }
  async paginate({companyId,page=1,limit=20,search="",status="",paymentStatus="",customerId=null,shipmentNumber="",fromDate=null,toDate=null,sortBy="createdAt",sortOrder="desc"}){
    const f={companyId,isActive:{ $ne:false }};
    if(status) f.status=status; if(paymentStatus) f.paymentStatus=paymentStatus; if(customerId) f.customerId=customerId; if(shipmentNumber) f.shipmentNumber=shipmentNumber.toUpperCase();
    if(fromDate||toDate){ f.invoiceDate={}; if(fromDate) f.invoiceDate.$gte=new Date(fromDate); if(toDate){const d=new Date(toDate);d.setHours(23,59,59,999);f.invoiceDate.$lte=d;} }
    if(search){const r=new RegExp(esc(search),"i");f.$or=[{invoiceNumber:r},{customerName:r},{shipmentNumber:r},{customerReference:r},{email:r},{mobile:r}];}
    const skip=(page-1)*limit; const [data,total]=await Promise.all([LogisticsInvoice.find(f).sort({[sortBy]:sortOrder==="asc"?1:-1}).skip(skip).limit(limit).lean(),LogisticsInvoice.countDocuments(f)]);
    return {data,pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}};
  }
  update({companyId,invoiceId,payload,auditEntry}){ return LogisticsInvoice.findOneAndUpdate({_id:invoiceId,companyId,isActive:{ $ne:false }},{$set:payload,...(auditEntry?{$push:{editHistory:auditEntry}}:{})},{new:true,runValidators:true}).lean(); }
  updateInvoiceCopy({companyId,invoiceId,invoiceCopy,updatedBy}){ return LogisticsInvoice.findOneAndUpdate({_id:invoiceId,companyId,isActive:{ $ne:false }},{$set:{invoiceCopy,updatedBy}},{new:true,runValidators:true}).lean(); }
  softDelete({companyId,invoiceId,userId}){ return LogisticsInvoice.findOneAndUpdate({_id:invoiceId,companyId,isActive:{ $ne:false }},{$set:{isActive:false,updatedBy:userId}},{new:true}).lean(); }
  summary(companyId){ return LogisticsInvoice.aggregate([{$match:{companyId,isActive:{ $ne:false }}},{$group:{_id:null,totalInvoices:{$sum:1},totalBilled:{$sum:"$invoiceTotal"},totalReceived:{$sum:"$amountReceived"},totalOutstanding:{$sum:"$balanceDue"},draft:{$sum:{$cond:[{$eq:["$status","draft"]},1,0]}},issued:{$sum:{$cond:[{$eq:["$status","issued"]},1,0]}}}}]); }
}
export default new LogisticsInvoiceRepository();
