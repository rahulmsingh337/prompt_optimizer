export interface DemoScenario {
  id: string;
  title: string;
  roughRequest: string;
  targetAI: string;
  domain: string;
  modeUsed: "BASIC" | "DETAIL";
  // For BASIC (or initial state)
  optimizedPrompt: string;
  improvements: string[];
  techniquesApplied: string[];
  proTip: string;
  // For DETAIL step simulator
  clarifyingQuestions?: {
    id: string;
    question: string;
    defaultAnswer: string;
  }[];
  // Post-answering demo variables
  resolvedScenario?: {
    roughRequest: string;
    answers: { question: string; answer: string }[];
    optimizedPrompt: string;
    improvements: string[];
    techniquesApplied: string[];
    proTip: string;
  };
}

export const DEMO_DATASETS: DemoScenario[] = [
  {
    id: "basic-marketing",
    title: "Scenario 1: Simple Marketing Request (BASIC Mode)",
    roughRequest: "Write me a sales email for a premium copper water bottle.",
    targetAI: "Claude",
    domain: "Creative",
    modeUsed: "BASIC",
    optimizedPrompt: `# ROLE & PERSPECTIVE
You are an expert Direct Response Copywriter specializing in premium, eco-friendly lifestyle products.

# CONTEXT & VALUE PROPOSITION
Product: Handcrafted 100% pure copper water bottle.
Benefits: Authentic Ayurvedic wellness properties, beautiful temperature-retaining aesthetic, zero-plastic sustainability, leakproof artisanal cap.
Audience: Conscious, premium lifestyle consumers, wellness practitioners, and luxury fitness enthusiasts.

# CONTEXTUAL INPUTS
[Client Name]: Insert recipient first name
[Offer]: 15% launch week discount

# COPYWRITING DIRECTIVES
1. Core Hook: Lead with the tactile, daily experience of crisp, cold wellness—avoiding cliché "salesy" jargon.
2. Tone: Warm, narrative-driven, visually descriptive, sophisticated yet approachable.
3. Structure:
   - Subject Line: 3 magnetic variations focusing on (1) Wellness/Ayurveda, (2) Aesthetic design, and (3) Limited offer.
   - Opening: Establish the sensory feel of premium copper.
   - Body Paragraphs: Bridge aesthetic design to everyday hydration health routines.
   - Call to Action: Clean, low-friction, highlighting the Launch discount.
4. Formatting constraints: Avoid exclamation marks, use short paragraphs (1-2 sentences max), and retain wide negative letter spacings.`,
    improvements: [
      "Assigned an expert 'Direct Response Copywriter' persona to raise tone authority.",
      "Identified sensory health advantages (Ayurvedic wellness, ice-cold taste) to make the value proposition concrete.",
      "Provided 3 diverse subject line angles (Wellness, Aesthetic, Offer) for testing.",
      "Enforced specific copywriting constraints (no exclamation points, max 2-sentence paragraphs) to combat standard 'AI-sounding' templates."
    ],
    techniquesApplied: [
      "System Persona Assignment",
      "Explicit Copy Constraints",
      "Sensory Value Frameworks",
      "Multi-Headed Creative Templates"
    ],
    proTip: "Save this copywriting layout as a core archetype whenever you launch digital e-commerce campaigns!"
  },
  {
    id: "detail-engineering",
    title: "Scenario 2: Complex Engineering Workflow (DETAIL Mode)",
    roughRequest: "write a python function that listens to database rows and sends them to rabbitmq",
    targetAI: "Gemini",
    domain: "Technical",
    modeUsed: "DETAIL",
    clarifyingQuestions: [
      {
        id: "q1",
        question: "Which database engine and change tracking mechanism are you using?",
        defaultAnswer: "PostgreSQL, using WAL/Logical Replication or simple timestamp polling."
      },
      {
        id: "q2",
        question: "How should connection failures or message delivery failures be handled?",
        defaultAnswer: "With exponential backoff retries and storing failed events in a local dead-letter backup log."
      },
      {
        id: "q3",
        question: "What is the expected message frequency/throughput?",
        defaultAnswer: "Moderate volume, roughly 100-500 partition events per second; order preservation is important."
      }
    ],
    // Initial state shows questions. When demo user clicks "Submit Answers" in UI:
    optimizedPrompt: "Please specify answers to the clarifying questions below to synthesize the fully detailed prompt...",
    improvements: [],
    techniquesApplied: [],
    proTip: "",
    resolvedScenario: {
      roughRequest: "write a python function that listens to database rows and sends them to rabbitmq",
      answers: [
        {
          question: "Which database engine and change tracking mechanism are you using?",
          answer: "PostgreSQL using logical replication slots (pg_recvlogical) to stream changes dynamically."
        },
        {
          question: "How should connection failures or message delivery failures be handled?",
          answer: "Retry 3 times with 1-second delay, then publish to a dead-letter queue (DLQ) in RabbitMQ and alert via log."
        },
        {
          question: "What is the expected message frequency/throughput?",
          answer: "Roughly 250 batch events/sec, where message ordering is critical per record ID."
        }
      ],
      optimizedPrompt: `# ROLE & MISSION
You are a Principal Software Engineer specializing in resilient, event-driven microservice architectures, real-time message brokers, and Python asynchronous programming.

# TECHNICAL STACK
- Language: Python 3.11+
- Database Engine: PostgreSQL
- Change Tracking System: Logical replication slots (\`pg_recvlogical\`) via \`psycopg2\` or \`pgio\`
- Message Broker: RabbitMQ (using the \`pika\` asynchronous library)

# LOGICAL SPECIFICATIONS & BEHAVIOR
1. Replication Slot Reader:
   - Establish a persistent connection to the Postgres replication slot.
   - Stream logical replication messages asynchronously.
   - Deserialize incoming events (JSON payloads) matching table mutations.

2. RabbitMQ Publisher:
   - Initialize channel configurations with publisher confirms enabled.
   - Publish messages to routing keys with ordering guaranteed matching the record primary key ID (e.g., routing key maps to 'tenant.table.record_id').
   - Enforce message persistence (delivery_mode=2).

3. Resilience & Failure Management:
   - Implement an exponential retry backoff mechanism (3 retries with 1s start window) on RabbitMQ connection drops.
   - If publish fails after retries, capture the payload, routing event, and timestamp, write it to a localized Dead-Letter-Queue (DLQ), and emit an ERROR status log.

# SYNTAX & QUALITY REQUIREMENTS
- Provide complete production-grade Python code utilizing type hints and solid docstrings.
- Ensure all connection objects are managed within clean context managers (\`with\` statements or try/except structures).
- Include standard logging, avoiding bare \`print\` statement calls.`,
      improvements: [
        "Specified an asynchronous Postgres replication hook stream, avoiding expensive high-CPU polling loops.",
        "Engineered strict failover rules: added Publisher Confirms, exponential connection retries, and RabbitMQ Dead Letter Queues.",
        "Resolved the sequencing constraint by mapping RabbitMQ routing keys directly to record primary key partitions."
      ],
      techniquesApplied: [
        "Asynchronous Multi-threading Frameworks",
        "XML-delimited Architectural Configurations",
        "Strict Publisher Congestion Controls",
        "Ordered Partition Routing Methods"
      ],
      proTip: "Logical replication slots require SUPERUSER or REPLICATION privileges in PostgreSQL; verify your user attributes before runtime deployment!"
    }
  }
];
