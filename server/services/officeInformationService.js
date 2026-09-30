const repository=require("../repositories/officeInformationRepository");
const TYPES=new Set(["office","hours","department","contact","policy","resource"]);
const STATUS=new Set(["active","archived","published","draft"]);
function validateRecord(input,partial=false){
    const recordType=String(input.recordType||"").trim().toLowerCase(), errors={};
    if(!TYPES.has(recordType)) errors.recordType="Invalid office information record type.";
    if(!partial&&(!input.data||typeof input.data!=="object"||Array.isArray(input.data))) errors.data="Record data is required.";
    if(input.title!==undefined&&String(input.title).length>160) errors.title="Title must not exceed 160 characters.";
    const status=String(input.status||(recordType==="policy"||recordType==="resource"?"draft":"active")).toLowerCase();
    if(!STATUS.has(status)) errors.status="Invalid status.";
    const sort=Number(input.sortOrder??0);
    if(!Number.isInteger(sort)||sort<0) errors.sortOrder="Sort order must be a non-negative integer.";
    return {errors,recordType,status,sortOrder:sort};
}
async function listForMember(){
    const types={}; for(const type of TYPES) types[type]=await repository.list(type,false);
    return {
        office:types.office.find(x=>x.status!=="archived")?.data||null,
        workingHours:types.hours.map(x=>({id:x.id,...x.data,status:x.status})),
        departments:types.department.filter(x=>x.status==="active").map(x=>({id:x.id,...x.data,status:x.status})),
        importantContacts:types.contact.filter(x=>x.status==="active").map(x=>({id:x.id,...x.data,status:x.status})),
        policies:types.policy.filter(x=>x.status==="published").map(x=>({id:x.id,...x.data,status:x.status})),
        resources:types.resource.filter(x=>x.status==="published").map(x=>({id:x.id,...x.data,status:x.status}))
    };
}
async function listAdmin(){const records={};for(const type of TYPES)records[type]=await repository.list(type,true);return records;}
async function create(input,userId){const v=validateRecord(input);if(Object.keys(v.errors).length)return {errors:v.errors};return {record:await repository.create({...input,...v,userId})};}
async function update(id,input,userId){const existing=await repository.getById(id);if(!existing)return {notFound:true};const v=validateRecord({...input,recordType:input.recordType||existing.recordType},true);if(Object.keys(v.errors).length)return {errors:v.errors};return {record:await repository.update(id,{...input,...v,data:input.data??existing.data,userId})};}
async function archive(id,userId){return {archived:await repository.archive(id,userId)};}
module.exports={listForMember,listAdmin,create,update,archive};
