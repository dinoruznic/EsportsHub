export const AGENT_ACTIVE_MS = 15000;

export function agentCommand(key: string, demo: boolean): string {
  const base = 'java -jar agent/target/esportshub-agent.jar';
  return demo
    ? `${base} --mock --start=14:00 --interval=2 --match-key=${key}`
    : `${base} --match-key=${key}`;
}

export function ageLabel(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`;
}

export type AgentState = 'active' | 'idle' | 'none';

export interface AgentStatus {
  state: AgentState;
  text: string;
}

export function agentStatus(lastSnapshotAt: number | null, now: number): AgentStatus {
  if (lastSnapshotAt === null) {
    return { state: 'none', text: 'Još nema podataka iz igre' };
  }
  const age = Math.max(0, now - lastSnapshotAt);
  return age < AGENT_ACTIVE_MS
    ? { state: 'active', text: `Agent šalje podatke · zadnji prije ${ageLabel(age)}` }
    : { state: 'idle', text: `Agent nije aktivan · zadnji podatak prije ${ageLabel(age)}` };
}

export function finishQuestion(
  scoreA: number,
  scoreB: number,
  winnerName: string,
  isFinal: boolean,
): string {
  const outcome = isFinal ? `${winnerName} osvaja turnir.` : `Pobjednik ${winnerName} ide dalje.`;
  return `Završiti meč ${scoreA} : ${scoreB}? ${outcome} Ovo se ne može poništiti.`;
}
