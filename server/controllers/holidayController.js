const service=require("../services/holidayService");
function filters(q={}){return {year:q.year, type:q.type, status:q.status, search:String(q.search||"").trim()}}
async function list(req,res){res.json({success:true,holidays:await service.listHolidays(filters(req.query))})}
async function get(req,res){res.json({success:true,holiday:await service.get(req.params.id)})}
async function create(req,res){res.status(201).json({success:true,message:"Holiday created successfully.",holiday:await service.create(req.user.id,req.body)})}
async function update(req,res){res.json({success:true,message:"Holiday updated successfully.",holiday:await service.update(req.params.id,req.body)})}
async function remove(req,res){res.json({success:true,message:"Holiday removed successfully.",holiday:await service.remove(req.params.id)})}
module.exports={list,get,create,update,remove};