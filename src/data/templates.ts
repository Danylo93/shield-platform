export type Language = "java" | "python" | "dotnet";
export type DotnetVersion = "6" | "8" | "9" | "10";

export interface Template {
  id: string;
  name: string;
  description: string;
  language: Language;
  dotnetVersion?: DotnetVersion;
  icon: string;
  tags: string[];
  stars: number;
  usageCount: number;
}

export const templates: Template[] = [
  // Java Templates
  {
    id: "java-spring-boot",
    name: "Spring Boot API",
    description: "RESTful API com Spring Boot, Spring Data JPA, e Swagger. Pronto para produção com health checks e métricas.",
    language: "java",
    icon: "☕",
    tags: ["API", "REST", "Spring Boot", "JPA"],
    stars: 4.8,
    usageCount: 342,
  },
  {
    id: "java-microservice",
    name: "Java Microservice",
    description: "Microserviço com Spring Cloud, Circuit Breaker, Config Server e Service Discovery integrado.",
    language: "java",
    icon: "☕",
    tags: ["Microservice", "Spring Cloud", "Resilience"],
    stars: 4.6,
    usageCount: 218,
  },
  {
    id: "java-kafka-consumer",
    name: "Kafka Consumer",
    description: "Consumer Kafka com Spring Kafka, dead letter queue, retry policy e schema registry.",
    language: "java",
    icon: "☕",
    tags: ["Kafka", "Event-Driven", "Messaging"],
    stars: 4.5,
    usageCount: 156,
  },
  // Python Templates
  {
    id: "python-fastapi",
    name: "FastAPI Service",
    description: "API moderna com FastAPI, Pydantic, SQLAlchemy e documentação automática OpenAPI.",
    language: "python",
    icon: "🐍",
    tags: ["API", "FastAPI", "Async", "OpenAPI"],
    stars: 4.9,
    usageCount: 487,
  },
  {
    id: "python-django",
    name: "Django REST",
    description: "API com Django REST Framework, autenticação JWT, filtros avançados e paginação.",
    language: "python",
    icon: "🐍",
    tags: ["API", "Django", "REST", "JWT"],
    stars: 4.4,
    usageCount: 203,
  },
  {
    id: "python-data-pipeline",
    name: "Data Pipeline",
    description: "Pipeline de dados com Apache Airflow, pandas, e conectores para S3/BigQuery.",
    language: "python",
    icon: "🐍",
    tags: ["Data", "ETL", "Airflow", "Pipeline"],
    stars: 4.7,
    usageCount: 178,
  },
  // .NET 6 Templates
  {
    id: "dotnet6-web-api",
    name: ".NET 6 Web API",
    description: "Web API com .NET 6, Minimal APIs, Entity Framework Core e autenticação Azure AD.",
    language: "dotnet",
    dotnetVersion: "6",
    icon: "🔷",
    tags: ["API", "Minimal API", "EF Core"],
    stars: 4.3,
    usageCount: 134,
  },
  // .NET 8 Templates
  {
    id: "dotnet8-web-api",
    name: ".NET 8 Web API",
    description: "Web API com .NET 8, Native AOT, output caching e performance otimizada.",
    language: "dotnet",
    dotnetVersion: "8",
    icon: "🔷",
    tags: ["API", ".NET 8", "AOT", "Performance"],
    stars: 4.7,
    usageCount: 289,
  },
  {
    id: "dotnet8-microservice",
    name: ".NET 8 Microservice",
    description: "Microserviço com .NET 8, MassTransit, OpenTelemetry e health checks.",
    language: "dotnet",
    dotnetVersion: "8",
    icon: "🔷",
    tags: ["Microservice", "MassTransit", "Observability"],
    stars: 4.6,
    usageCount: 167,
  },
  // .NET 9 Templates
  {
    id: "dotnet9-web-api",
    name: ".NET 9 Web API",
    description: "Web API moderna com .NET 9, HybridCache, OpenAPI melhorado e LINQ otimizado.",
    language: "dotnet",
    dotnetVersion: "9",
    icon: "🔷",
    tags: ["API", ".NET 9", "HybridCache"],
    stars: 4.8,
    usageCount: 198,
  },
  // .NET 10 Templates
  {
    id: "dotnet10-web-api",
    name: ".NET 10 Web API (Preview)",
    description: "Web API com .NET 10 preview, novos recursos experimentais e melhorias de runtime.",
    language: "dotnet",
    dotnetVersion: "10",
    icon: "🔷",
    tags: ["API", ".NET 10", "Preview", "Experimental"],
    stars: 4.2,
    usageCount: 45,
  },
];

export const languageColors: Record<Language, string> = {
  java: "var(--java)",
  python: "var(--python)",
  dotnet: "var(--dotnet)",
};

export const languageLabels: Record<Language, string> = {
  java: "Java",
  python: "Python",
  dotnet: ".NET",
};

export const dotnetVersions: DotnetVersion[] = ["6", "8", "9", "10"];
