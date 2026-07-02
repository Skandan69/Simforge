export const experienceWorkflow = [
  { title: "Organization Blueprint", description: "Define what better performance means." },
  { title: "Knowledge Upload", description: "Bring in the guidance employees rely on." },
  { title: "Knowledge Intelligence", description: "Organize knowledge into useful sections." },
  { title: "Sophia Simulation", description: "Practice realistic workplace situations." },
  { title: "Capability Intelligence", description: "Measure capability across practice." },
  { title: "Coaching & Improvement", description: "Turn evidence into focused development." },
] as const;

export const notAnLms = [
  { title: "Not an LMS", description: "SimForge measures applied capability; it does not manage courses, attendance, or certificates." },
  { title: "Not a quiz generator", description: "It focuses on realistic decisions and behaviors rather than recall questions." },
  { title: "Not a generic chatbot", description: "Sophia works inside configured scenarios, objectives, and company context." },
  { title: "Not a document repository", description: "Uploaded knowledge becomes governed input for practice and evaluation." },
] as const;

export const foundations = [
  { title: "Organization Blueprint", description: "Defines what success means, which capabilities matter, and what must never happen." },
  { title: "Knowledge Intelligence", description: "Understands uploaded documents and identifies policies, procedures, product information, and other useful sections." },
  { title: "Sophia Simulation", description: "Lets employees practice realistic scenarios with a focused AI trainer." },
  { title: "Capability Intelligence", description: "Builds an explainable view of improvement across repeated simulations." },
] as const;

export const futureFoundations = ["Workflow Intelligence", "AI Coach", "Manager Intelligence", "Speech Intelligence"] as const;

export const demoWalkthrough = [
  { time: "Minute 1–2", title: "Frame the problem", description: "Explain that organizations have knowledge, but struggle to prove employees can apply it under pressure." },
  { time: "Minute 2–4", title: "Organization Blueprint", description: "Show how the organization defines outcomes, costly mistakes, guardrails, and priority capabilities." },
  { time: "Minute 4–6", title: "Knowledge Intelligence", description: "Open a processed document and show classified sections, confidence, importance, and capability links." },
  { time: "Minute 6–10", title: "Sophia Simulation", description: "Start a scenario, respond as a learner, and show how Sophia stays in role and uses company context." },
  { time: "Minute 10–13", title: "Capability Profile", description: "End the simulation and connect the evaluation to long-term capability evidence and focus areas." },
  { time: "Minute 13–15", title: "Business value and pilot ask", description: "Summarize the measurable outcome, then propose one department, one use case, and a focused pilot." },
] as const;

export const founderTalkingPoints = [
  "Companies upload knowledge once.",
  "SimForge turns it into practice.",
  "Employees train with Sophia.",
  "The system measures capability improvement.",
  "Managers see who needs coaching.",
] as const;

export const experienceFaq = [
  { question: "Can SimForge replace an LMS?", answer: "No. SimForge complements an LMS by measuring whether employees can apply knowledge in realistic situations. An LMS remains useful for course delivery and administration." },
  { question: "Can we upload SOPs and policies?", answer: "Yes. Knowledge Studio supports governed document uploads, and Knowledge Intelligence identifies useful sections for future practice." },
  { question: "Can Sophia train employees on company knowledge?", answer: "Yes. Sophia uses relevant processed knowledge connected to the simulation, while staying within the configured scenario and objectives." },
  { question: "Can managers measure improvement?", answer: "Capability Intelligence already records learner improvement over repeated simulations. Dedicated manager views are a future foundation." },
  { question: "Is this only for customer support?", answer: "No. The same foundation can support sales, compliance, leadership, onboarding, product knowledge, technical skills, and other workforce situations." },
  { question: "Does this require technical setup?", answer: "The platform needs an initial workspace and secure deployment configuration. Day-to-day setup is designed for admins and trainers, without coding." },
] as const;

export const experienceBestPractices = [
  { title: "Upload clean SOPs", description: "Start with current, approved guidance and remove duplicate or outdated files." },
  { title: "Start with one department", description: "Choose a focused team and a visible business problem for the first pilot." },
  { title: "Keep simulations focused", description: "Use one scenario, a small set of objectives, and observable success criteria." },
  { title: "Review capability profiles", description: "Look at repeated evidence rather than treating one simulation as a final judgment." },
  { title: "Use coaching after practice", description: "Turn identified gaps into specific follow-up practice and human coaching." },
] as const;
