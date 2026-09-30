const repository=require("../repositories/contactRepository");
const TYPES=new Set(["project","partnership","career","general"]);
function validate(input){
 const errors={},name=String(input.fullName||"").trim(),email=String(input.email||"").trim().toLowerCase(),phone=String(input.phone||"").trim(),company=String(input.company||"").trim(),subject=String(input.subject||"").trim(),message=String(input.message||"").trim(),inquiryType=String(input.inquiryType||"general").trim().toLowerCase();
 if(name.length<2||name.length>100)errors.fullName="Full name must be between 2 and 100 characters.";
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>150)errors.email="Please provide a valid email address.";
 if(phone&&(phone.length>30||!/^[+()\-\s\d.]+$/.test(phone)))errors.phone="Please provide a valid phone number.";
 if(company.length>150)errors.company="Company must not exceed 150 characters.";
 if(!TYPES.has(inquiryType))errors.inquiryType="Invalid inquiry type.";
 if(subject.length<3||subject.length>160)errors.subject="Subject must be between 3 and 160 characters.";
 if(message.length<20||message.length>2000)errors.message="Message must be between 20 and 2000 characters.";
 return {errors,data:{fullName:name,email,phone,company,inquiryType,subject,message}};
}
async function submit(input){const r=validate(input);if(Object.keys(r.errors).length)return r;return {id:await repository.create(r.data)};}
async function listInquiries(query){const status=query.status?String(query.status).toLowerCase():null;if(status&&!["new","in_progress","resolved","spam","archived"].includes(status))return {errors:{status:"Invalid status."}};const limit=Math.min(100,Math.max(1,Number(query.limit||50))),offset=Math.max(0,Number(query.offset||0));if(!Number.isInteger(limit)||!Number.isInteger(offset))return {errors:{pagination:"Invalid pagination."}};return repository.list({status,limit,offset});}
async function updateStatus(id,status,userId){if(!["new","in_progress","resolved","spam","archived"].includes(status))return {errors:{status:"Invalid status."}};return {updated:await repository.updateStatus(id,status,userId)};}
module.exports={submit,listInquiries,updateStatus};
