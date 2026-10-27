import { getAllTopics } from "@/lib/quiz-data";

// Every topic with its questions as one static JSON file, prerendered at build time. The mock
// exam and review pages load this once; a single request also avoids firing many parallel
// requests at a cold dev server, which made some of them fail while the route compiled.

export function GET() {
  return Response.json(getAllTopics());
}
