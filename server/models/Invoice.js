import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      unique: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    noOfDays: { type: Number, required: true, min: 1 },
    perDayCost: { type: Number, required: true, min: 1 },
    trainerCost: { type: Number, required: true, min: 1 },
    panNumber: { type: String, required: true, trim: true },
    travelToFroCost: { type: Number, default: 0, min: 0 },
    otherExpenses: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["raised", "approved", "cleared"],
      default: "raised",
    },
    raisedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    clearedAt: { type: Date },
    adminRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);