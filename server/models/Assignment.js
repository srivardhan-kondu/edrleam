import mongoose from "mongoose";

const AssignmentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    noOfDays: { type: Number, default: 0 },
    perDayCost: { type: Number, default: 0 },
    trainerCost: { type: Number, required: true },
    status: {
      type: String,
      enum: ["assigned", "pending", "accepted", "rejected", "completed"],
      default: "assigned",
    },
    notes: { type: String, default: "" },
    toc: {
      filename: { type: String, default: null },
      filepath: { type: String, default: null },
      uploadedAt: { type: Date, default: null },
      description: { type: String, default: "" },
    },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Assignment || mongoose.model("Assignment", AssignmentSchema);
