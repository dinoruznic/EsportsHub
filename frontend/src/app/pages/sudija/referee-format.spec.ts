import { agentCommand, agentStatus, finishQuestion } from './referee-format';

describe('referee format', () => {
  it('builds the real and the demo agent command', () => {
    expect(agentCommand('abc', false)).toBe(
      'java -jar agent/target/esportshub-agent.jar --match-key=abc',
    );
    expect(agentCommand('abc', true)).toBe(
      'java -jar agent/target/esportshub-agent.jar --mock --start=14:00 --interval=2 --match-key=abc',
    );
  });

  it('describes the agent as active, idle or silent', () => {
    const now = Date.parse('2026-10-08T12:00:00Z');

    expect(agentStatus(null, now)).toEqual({
      state: 'none',
      text: 'Još nema podataka iz igre',
    });
    expect(agentStatus(now - 2000, now)).toEqual({
      state: 'active',
      text: 'Agent šalje podatke · zadnji prije 2 s',
    });
    expect(agentStatus(now - 14999, now).state).toBe('active');
    expect(agentStatus(now - 15000, now)).toEqual({
      state: 'idle',
      text: 'Agent nije aktivan · zadnji podatak prije 15 s',
    });
    expect(agentStatus(now - 6 * 60000, now)).toEqual({
      state: 'idle',
      text: 'Agent nije aktivan · zadnji podatak prije 6 min',
    });
  });

  it('asks before finishing a match and mentions where the winner goes', () => {
    expect(finishQuestion(2, 1, 'Tim 2', false)).toBe(
      'Završiti meč 2 : 1? Pobjednik Tim 2 ide dalje. Ovo se ne može poništiti.',
    );
    expect(finishQuestion(0, 2, 'Tim 3', true)).toBe(
      'Završiti meč 0 : 2? Tim 3 osvaja turnir. Ovo se ne može poništiti.',
    );
  });
});
