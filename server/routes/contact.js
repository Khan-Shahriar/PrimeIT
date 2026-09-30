const express=require("express");
const {requireAuth,requirePermission}=require("../middleware/auth");
const controller=require("../controllers/contactController");
const router=express.Router();
router.post("/",controller.submit);
router.get("/",requireAuth,requirePermission("contact_inquiries.view"),controller.list);
router.patch("/:id/status",requireAuth,requirePermission("contact_inquiries.update"),controller.updateStatus);
module.exports=router;