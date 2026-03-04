export interface Project {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  color: string;
}

export const projects: Project[] = [
  { id: "aqa", name: "AQA", abbreviation: "A", description: "Projeto de automação de testes para garantir qualidade contínua nas aplicações.", color: "hsl(0, 70%, 50%)" },
  { id: "archive", name: "Archive", abbreviation: "A", description: "Repositórios obsoletos ou não mais utilizados, mantidos para referência histórica.", color: "hsl(220, 15%, 50%)" },
  { id: "argo", name: "ARGO", abbreviation: "A", description: "Projeto ARGO principal.", color: "hsl(280, 60%, 50%)" },
  { id: "connect", name: "Connect", abbreviation: "C", description: "Projeto contendo serviços relacionados ao Connect.", color: "hsl(200, 70%, 50%)" },
  { id: "core", name: "Core", abbreviation: "C", description: "Base central de funcionalidades essenciais para o ecossistema.", color: "hsl(180, 60%, 45%)" },
  { id: "database", name: "Database", abbreviation: "D", description: "Controle de versionamento e gerenciamento de scripts e objetos de banco de dados.", color: "hsl(30, 80%, 50%)" },
  { id: "devops", name: "Devops", abbreviation: "⚙", description: "Implementação de práticas de DevOps para infraestrutura e entrega contínua.", color: "hsl(150, 60%, 45%)" },
  { id: "distributed-services", name: "Distributed Services", abbreviation: "DS", description: "Desenvolvimento de serviços distribuídos para escalabilidade e resiliência.", color: "hsl(260, 50%, 55%)" },
  { id: "hoovie", name: "Hoovie", abbreviation: "H", description: "Projeto Hoovie.", color: "hsl(340, 60%, 50%)" },
  { id: "mobile", name: "Mobile", abbreviation: "M", description: "Desenvolvimento e manutenção de aplicativos móveis para iOS e Android.", color: "hsl(45, 80%, 50%)" },
  { id: "phoenix", name: "Phoenix", abbreviation: "P", description: "Projeto Phoenix.", color: "hsl(10, 70%, 50%)" },
  { id: "root-cause", name: "Root Cause", abbreviation: "RC", description: "Projetos relacionados ao time de DevSecOps.", color: "hsl(0, 65%, 55%)" },
  { id: "serverless", name: "Serverless", abbreviation: "S", description: "Soluções escaláveis serverless para atender demandas sem servidores dedicados.", color: "hsl(190, 70%, 45%)" },
  { id: "shared-libraries", name: "Shared Libraries", abbreviation: "SL", description: "Bibliotecas compartilhadas para padronização e reutilização entre projetos.", color: "hsl(120, 50%, 45%)" },
  { id: "springfield-school", name: "Springfield School", abbreviation: "SS", description: "Espaço dedicado à aprendizagem contínua, troca de ideias e desenvolvimento criativo.", color: "hsl(270, 55%, 50%)" },
];
