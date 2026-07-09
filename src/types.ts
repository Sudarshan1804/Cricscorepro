export interface BatsmanStats {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    out: boolean;
    dismissal: string;
}

export interface BowlerStats {
    runs: number;
    balls: number;
    maidens: number;
    wickets: number;
}

export interface WicketRecord {
    score: number;
    wickets: number;
    overs: string;
    batsmanOut: string;
}

export interface BallRecord {
    text: string;
    type: 'legal' | 'boundary' | 'extra' | 'wicket';
}

export interface InningsData {
    battingTeam: 'A' | 'B';
    fieldingTeam: 'A' | 'B';
    runs: number;
    wickets: number;
    ballsBowled: number; // total legal balls bowled
    extras: {
        wide: number;
        noBall: number;
        bye: number;
        total: number;
    };
    batsmen: Record<string, BatsmanStats>;
    bowlers: Record<string, BowlerStats>;
    currentStriker: string | null;
    currentNonStriker: string | null;
    currentBowler: string | null;
    lastBowler: string | null;
    currentOverTimeline: BallRecord[];
    currentOverRuns: number; // runs conceded in current over to compute maidens
    target: number | null; // target run count if Innings 2
    fallOfWickets: WicketRecord[];
}

export interface MatchState {
    teamSize: number;
    totalOvers: number;
    teamAName: string;
    teamBName: string;
    teamAPlayers: string[];
    teamBPlayers: string[];
    tossWinner: 'A' | 'B' | null;
    tossChoice: 'bat' | 'bowl' | null;
    currentInningsIndex: number; // 0 = Innings 1, 1 = Innings 2
    innings: [InningsData, InningsData | null];
    matchWinner: 'A' | 'B' | null;
    matchWinnerReason: string;
    screen: 'setup' | 'players' | 'toss' | 'transition' | 'scoring' | 'scorecard';
    extraRunsPenalty: boolean; // true = standard (+1), false = gully (+0)
}
