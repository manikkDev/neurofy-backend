import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import { env, connectDatabase } from "../config";
import { User, DoctorProfile, DoctorNote } from "../models";

async function seedNotesForPatient() {
  try {
    console.log("[Seed] Starting doctor notes seeding for patient@gmail.com...");

    await connectDatabase();

    // Find the patient
    const patient = await User.findOne({ email: "patient@gmail.com", role: "patient" });
    
    if (!patient) {
      throw new Error("Patient patient@gmail.com not found");
    }

    // Find the doctor
    const doctor = await User.findOne({ email: "dr.smith@neurofy.com", role: "doctor" });
    
    if (!doctor) {
      throw new Error("Doctor dr.smith@neurofy.com not found");
    }

    // Clear existing notes for this patient
    await DoctorNote.deleteMany({ patientId: patient._id });
    console.log("Cleared existing notes for patient@gmail.com");

    console.log("Creating doctor notes...");

    // Note 1: Initial Consultation
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient presents with bilateral upper extremity tremor, more pronounced in the right hand. Symptoms began approximately 6 months ago and have been gradually worsening. Tremor is most noticeable during purposeful movements and improves with rest. No family history of movement disorders reported. Physical examination shows 4-6 Hz tremor amplitude, moderate severity. Recommend starting propranolol 40mg twice daily and scheduling follow-up in 4 weeks.",
      diagnosis: "Essential Tremor - Moderate",
      isPrivate: false,
    });

    // Note 2: First Follow-up
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient reports 40% reduction in tremor frequency after starting propranolol. Mild side effects of fatigue reported but well tolerated. Tremor amplitude decreased from moderate to mild during examination. Patient able to write and drink from cup with improved stability. Continue current dosage, consider gradual increase if symptoms persist. Patient educated about trigger factors (caffeine, stress, fatigue).",
      diagnosis: "Essential Tremor - Improving",
      isPrivate: false,
    });

    // Note 3: Medication Adjustment
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient continues to show improvement but still experiences tremor during high-stress situations. Increased propranolol to 60mg twice daily. Blood pressure and heart rate within normal limits. Patient reports better sleep quality and reduced anxiety. Discussing potential addition of primidone if current regimen insufficient after 4 weeks. Counseling provided on stress management techniques.",
      diagnosis: "Essential Tremor - Controlled",
      isPrivate: false,
    });

    // Note 4: Device Setup Consultation
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient fitted with ESP32 tremor monitoring device. Device successfully paired and calibrated. Patient instructed on proper wear and charging procedures. Real-time monitoring will allow for better assessment of tremor patterns and medication effectiveness. Data will be reviewed at next appointment. Patient expressed satisfaction with the unobtrusive design and ease of use.",
      diagnosis: "Essential Tremor - Monitored",
      isPrivate: false,
    });

    // Note 5: Quarterly Review
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Three-month review shows excellent progress. Device data confirms 60% reduction in tremor episodes compared to baseline. Average frequency decreased from 6.2 Hz to 4.8 Hz. Patient reports significant improvement in quality of life - able to return to hobbies including painting and playing guitar. Current medication regimen effective with minimal side effects. Recommend continuation and annual neurological review.",
      diagnosis: "Essential Tremor - Well Controlled",
      isPrivate: false,
    });

    // Note 6: Lifestyle Recommendations
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Discussed lifestyle modifications to support tremor management. Patient advised to: 1) Limit caffeine intake to <200mg/day, 2) Practice stress reduction techniques (meditation, deep breathing), 3) Maintain regular sleep schedule, 4) Avoid alcohol as tremor trigger, 5) Use weighted utensils for meals when needed. Patient receptive to recommendations and will implement gradually.",
      diagnosis: "Essential Tremor - Lifestyle Management",
      isPrivate: false,
    });

    // Note 7: Private Clinical Note
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Clinical observation: Patient shows slight intention tremor during finger-to-nose test, but no dysmetria. Gait normal, no ataxia observed. No signs of Parkinsonian features (rigidity, bradykinesia). Cognitive screening within normal limits. Consider differential diagnosis includes enhanced physiological tremor vs essential tremor. Propranolol response supports essential tremor diagnosis. Monitor for any progression or new neurological symptoms.",
      diagnosis: "Essential Tremor - Clinical Assessment",
      isPrivate: true,
    });

    // Note 8: Recent Progress Update
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient reports excellent control of symptoms with current regimen. Device data shows consistent pattern: mild tremor in early morning (6:00-8:00 AM) likely related to caffeine intake, otherwise minimal activity throughout day. Patient successfully reduced caffeine to 1 cup per day with noticeable improvement. No medication side effects reported. Continue current treatment plan. Next follow-up in 6 months unless issues arise.",
      diagnosis: "Essential Tremor - Stable",
      isPrivate: false,
    });

    // Note 9: Emergency Contact Note
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Patient experienced temporary exacerbation of tremor following high-stress work deadline. Symptoms resolved with rest and resumed baseline within 24 hours. Discussed stress management strategies and provided emergency contact information. No medication adjustment needed. Reinforced importance of stress reduction in tremor management.",
      diagnosis: "Essential Tremor - Stress-Related Exacerbation",
      isPrivate: false,
    });

    // Note 10: Future Planning
    await DoctorNote.create({
      patientId: patient._id,
      doctorId: doctor._id,
      content: "Planning discussion: Patient inquiring about long-term prognosis and treatment options. Reassured that essential tremor is generally progressive but slow. Discussed future options including deep brain stimulation if medication becomes insufficient. Patient currently satisfied with conservative management. Will revisit advanced options if tremor significantly impacts daily activities despite optimal medical therapy.",
      diagnosis: "Essential Tremor - Long-term Planning",
      isPrivate: false,
    });

    console.log("Doctor notes seeded successfully for patient@gmail.com");
    console.log("Notes created:");
    console.log("  1. Initial Consultation - Essential Tremor - Moderate");
    console.log("  2. First Follow-up - Essential Tremor - Improving");
    console.log("  3. Medication Adjustment - Essential Tremor - Controlled");
    console.log("  4. Device Setup Consultation - Essential Tremor - Monitored");
    console.log("  5. Quarterly Review - Essential Tremor - Well Controlled");
    console.log("  6. Lifestyle Recommendations - Essential Tremor - Lifestyle Management");
    console.log("  7. Private Clinical Note - Essential Tremor - Clinical Assessment (Private)");
    console.log("  8. Recent Progress Update - Essential Tremor - Stable");
    console.log("  9. Emergency Contact Note - Essential Tremor - Stress-Related Exacerbation");
    console.log("  10. Future Planning - Essential Tremor - Long-term Planning");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedNotesForPatient();
