import mongoose from "mongoose";

const MiscCostSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  { _id: true }
);

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    collegeName: { type: String, required: true },
    description: { type: String, default: "" },
    dealAmount: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "in-progress", "completed", "cancelled"],
      default: "upcoming",
    },
    skillsRequired: [{ type: String }],
    contactPerson: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    miscCosts: { type: [MiscCostSchema], default: [] },
  },
  { timestamps: true }
);

ProjectSchema.index({ collegeName: 1 });
ProjectSchema.index({ status: 1 });

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
