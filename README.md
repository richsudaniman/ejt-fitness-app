# EJT Fitness

A fitness coaching platform in production use by **32 personal training
clients** under the EJT Fitness brand.

## My Role

I designed and built this app for EJT Fitness using Base44, an AI-powered
app platform that provides authentication, database, hosting, and AI-assisted
code generation. I used Base44 to move fast on scaffolding and standard UI,
and hand-built the parts that needed custom logic:

- **Passio API integration:** built the full integration with Passio's food
  recognition API myself, powering meal identification from photos, image
  uploads, and barcode entry
- **AI calorie reader:** hand-coded the calorie reading flow using Base44's
  InvokeLLM, turning food images into structured calorie and macro data
- **Progress analytics:** hand-coded the analytics that turn client data
  (weight, body composition, lifts, goals) into trends trainers and clients
  can act on
- **Trainer–client assignment debugging:** diagnosed and fixed issues in how
  clients were assigned to trainers, making sure each trainer saw the right
  clients and each client got the right plans
- **Client delivery:** worked with EJT Fitness to gather requirements, roll
  the app out to their 32 clients, and iterate based on feedback
