import React, { useState, useEffect } from 'react';
import type { MatchState, InningsData } from './types';

// ==========================================
// INITIALIZERS
// ==========================================
const createInningsTemplate = (battingTeam: 'A' | 'B', fieldingTeam: 'A' | 'B', target: number | null = null): InningsData => {
    return {
        battingTeam,
        fieldingTeam,
        runs: 0,
        wickets: 0,
        ballsBowled: 0,
        extras: { wide: 0, noBall: 0, bye: 0, total: 0 },
        batsmen: {},
        bowlers: {},
        currentStriker: null,
        currentNonStriker: null,
        currentBowler: null,
        lastBowler: null,
        currentOverTimeline: [],
        currentOverRuns: 0,
        target,
        fallOfWickets: []
    };
};

const initialMatchState: MatchState = {
    teamSize: 11,
    totalOvers: 5,
    teamAName: 'Strikers',
    teamBName: 'Blasters',
    teamAPlayers: [],
    teamBPlayers: [],
    tossWinner: null,
    tossChoice: null,
    currentInningsIndex: 0,
    innings: [createInningsTemplate('A', 'B'), null],
    matchWinner: null,
    matchWinnerReason: '',
    screen: 'setup',
    extraRunsPenalty: true
};

const getInitialMatchState = (): MatchState => {
    try {
        const saved = localStorage.getItem('cricscore_saved_teams');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.teamAName && parsed.teamBName && parsed.teamAPlayers && parsed.teamBPlayers) {
                return {
                    ...initialMatchState,
                    teamSize: parsed.teamSize || parsed.teamAPlayers.length || 11,
                    teamAName: parsed.teamAName,
                    teamBName: parsed.teamBName,
                    teamAPlayers: parsed.teamAPlayers,
                    teamBPlayers: parsed.teamBPlayers
                };
            }
        }
    } catch (e) {
        console.error('Error loading saved match settings:', e);
    }
    return initialMatchState;
};

export default function App() {
    // Core States
    const [matchState, setMatchState] = useState<MatchState>(getInitialMatchState);
    const [history, setHistory] = useState<MatchState[]>([]);

    // Roster save preference state
    const [saveRoster, setSaveRoster] = useState<boolean>(() => {
        try {
            return localStorage.getItem('cricscore_save_rosters_option') !== 'false';
        } catch {
            return true;
        }
    });
    
    // Theme state
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');

    // Tab state (for lists and final scorecard tabs)
    const [activeRosterTab, setActiveRosterTab] = useState<'A' | 'B'>('A');
    const [activeScorecardTab, setActiveScorecardTab] = useState<number>(0);

    // Modal Prompts States
    const [activePrompt, setActivePrompt] = useState<'striker' | 'nonStriker' | 'bowler' | 'replacementStriker' | 'replacementNonStriker' | null>(null);
    const [extrasPrompt, setExtrasPrompt] = useState<'wide' | 'noBall' | null>(null);
    
    // Wicket Modal form states
    const [wicketPrompt, setWicketPrompt] = useState<boolean>(false);
    const [wicketWhoIsOut, setWicketWhoIsOut] = useState<'striker' | 'nonStriker'>('striker');
    const [wicketDismissalType, setWicketDismissalType] = useState<string>('Bowled');
    const [wicketFielder, setWicketFielder] = useState<string>('');

    // Coin Toss Flip States
    const [tossCaller, setTossCaller] = useState<'A' | 'B'>('A');
    const [tossCall, setTossCall] = useState<'heads' | 'tails'>('heads');
    const [isFlipping, setIsFlipping] = useState<boolean>(false);
    const [flipResult, setFlipResult] = useState<'heads' | 'tails' | null>(null);

    const handleCoinFlip = () => {
        if (isFlipping) return;
        setIsFlipping(true);
        setFlipResult(null);

        setTimeout(() => {
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            setFlipResult(result);
            setIsFlipping(false);

            let winnerCode: 'A' | 'B';
            if (tossCall === result) {
                winnerCode = tossCaller;
            } else {
                winnerCode = tossCaller === 'A' ? 'B' : 'A';
            }

            setMatchState(prev => ({
                ...prev,
                tossWinner: winnerCode
            }));
            
            const winnerName = winnerCode === 'A' ? matchState.teamAName : matchState.teamBName;
            showToast(`🪙 Coin landed on ${result.toUpperCase()}! ${winnerName} won the toss!`);
        }, 1200);
    };

    // Toast state
    const [toastMessage, setToastMessage] = useState<string>('');

    // Set body theme class
    useEffect(() => {
        document.body.className = `${theme}-theme`;
    }, [theme]);

    // Toast auto-hide
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(''), 2500);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Trigger victory celebration confetti
    useEffect(() => {
        if (matchState.screen === 'scorecard' && matchState.matchWinner) {
            let active = true;
            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
            
            const triggerConfetti = () => {
                if (!active) return;
                const p = document.createElement('div');
                p.style.position = 'fixed';
                p.style.top = '-20px';
                p.style.left = Math.random() * 100 + 'vw';
                p.style.width = Math.random() * 8 + 6 + 'px';
                p.style.height = Math.random() * 10 + 6 + 'px';
                p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                p.style.zIndex = '999';
                p.style.borderRadius = '2px';
                document.body.appendChild(p);

                let curY = -20;
                let speed = Math.random() * 4 + 3;
                let wobbleSpeed = Math.random() * 0.05 + 0.02;
                let angle = 0;

                const fall = () => {
                    curY += speed;
                    angle += wobbleSpeed;
                    p.style.top = curY + 'px';
                    p.style.transform = `translateX(${Math.sin(angle) * 15}px) rotate(${angle * 50}deg)`;

                    if (curY < window.innerHeight && active) {
                        requestAnimationFrame(fall);
                    } else {
                        p.remove();
                    }
                };
                requestAnimationFrame(fall);
            };

            const interval = setInterval(triggerConfetti, 150);
            return () => {
                active = false;
                clearInterval(interval);
            };
        }
    }, [matchState.screen, matchState.matchWinner]);

    // Helper: Show toast notification
    const showToast = (msg: string) => setToastMessage(msg);

    // Helper: Save current state to history stack for undo
    const pushHistory = (stateToSave: MatchState) => {
        setHistory(prev => [...prev, JSON.parse(JSON.stringify(stateToSave))]);
    };

    // Undo action
    const handleUndo = () => {
        if (history.length === 0) {
            showToast('No actions to undo!');
            return;
        }
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        setMatchState(previousState);
        showToast('Last ball undone! ↩️');
    };

    // ==========================================
    // SCREEN 1: CONFIGURATION FORM HANDLERS
    // ==========================================
    const handleSetupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const size = matchState.teamSize;
        const overs = matchState.totalOvers;
        const nameA = matchState.teamAName.trim();
        const nameB = matchState.teamBName.trim();

        if (size < 2 || size > 15) {
            showToast('Players per team must be between 2 and 15');
            return;
        }
        if (overs < 1 || overs > 50) {
            showToast('Overs must be between 1 and 50');
            return;
        }
        if (nameA === nameB) {
            showToast('Team names must be different');
            return;
        }

        // Initialize players array with default templates
        setMatchState(prev => ({
            ...prev,
            teamAPlayers: Array(size).fill('').map((_, idx) => prev.teamAPlayers[idx] || ''),
            teamBPlayers: Array(size).fill('').map((_, idx) => prev.teamBPlayers[idx] || ''),
            screen: 'players'
        }));
    };

    // ==========================================
    // SCREEN 2: PLAYER ROSTERS HANDLERS
    // ==========================================
    const handlePlayerNameChange = (team: 'A' | 'B', index: number, value: string) => {
        setMatchState(prev => {
            const players = [...(team === 'A' ? prev.teamAPlayers : prev.teamBPlayers)];
            players[index] = value;
            return {
                ...prev,
                [team === 'A' ? 'teamAPlayers' : 'teamBPlayers']: players
            };
        });
    };

    const handleQuickFill = () => {
        const firstNames = ['Virat', 'Rohit', 'Hardik', 'Jasprit', 'Rishabh', 'Ravindra', 'KL', 'Shubman', 'Shreyas', 'Axar', 'Yuzvendra', 'Suryakumar', 'Mohammed', 'Arshdeep', 'Kuldeep'];
        const lastNames = ['Kohli', 'Sharma', 'Pandya', 'Bumrah', 'Pant', 'Jadeja', 'Rahul', 'Gill', 'Iyer', 'Patel', 'Chahal', 'Yadav', 'Siraj', 'Singh', 'Yadav'];

        const generateUniqueTeam = (teamSize: number) => {
            const names: string[] = [];
            while (names.length < teamSize) {
                const randFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
                const randLast = lastNames[Math.floor(Math.random() * lastNames.length)];
                const fullName = `${randFirst} ${randLast}`;
                if (!names.includes(fullName)) {
                    names.push(fullName);
                }
            }
            return names;
        };

        setMatchState(prev => {
            const teamAPlayers = generateUniqueTeam(prev.teamSize);
            const teamBPlayers = generateUniqueTeam(prev.teamSize);
            return {
                ...prev,
                teamAPlayers,
                teamBPlayers
            };
        });
        showToast('⚡ Rosters Quick-Filled!');
    };

    const handlePlayersSubmit = () => {
        const playersA = matchState.teamAPlayers.map(n => n.trim());
        const playersB = matchState.teamBPlayers.map(n => n.trim());

        if (playersA.some(n => n === '') || playersB.some(n => n === '')) {
            showToast('All player names must be filled in!');
            return;
        }

        if (new Set(playersA).size !== playersA.length) {
            showToast(`Duplicate player names found in ${matchState.teamAName}!`);
            return;
        }

        if (new Set(playersB).size !== playersB.length) {
            showToast(`Duplicate player names found in ${matchState.teamBName}!`);
            return;
        }

        const duplicatesAcross = playersA.filter(n => playersB.includes(n));
        if (duplicatesAcross.length > 0) {
            showToast(`Player name "${duplicatesAcross[0]}" cannot be in both teams!`);
            return;
        }

        // Save rosters if selected
        if (saveRoster) {
            try {
                localStorage.setItem('cricscore_saved_teams', JSON.stringify({
                    teamSize: matchState.teamSize,
                    teamAName: matchState.teamAName,
                    teamBName: matchState.teamBName,
                    teamAPlayers: playersA,
                    teamBPlayers: playersB
                }));
                localStorage.setItem('cricscore_save_rosters_option', 'true');
                showToast('💾 Teams & Players saved successfully!');
            } catch (e) {
                console.error('Failed to save to localStorage:', e);
            }
        } else {
            try {
                localStorage.removeItem('cricscore_saved_teams');
                localStorage.setItem('cricscore_save_rosters_option', 'false');
            } catch (e) {
                console.error('Failed to clear localStorage:', e);
            }
        }

        setMatchState(prev => ({
            ...prev,
            teamAPlayers: playersA,
            teamBPlayers: playersB,
            screen: 'toss'
        }));
    };

    // ==========================================
    // SCREEN 3: TOSS HANDLERS
    // ==========================================
    const handleTossWinnerSelect = (winnerCode: 'A' | 'B') => {
        setMatchState(prev => ({ ...prev, tossWinner: winnerCode }));
    };

    const handleTossChoiceSelect = (choice: 'bat' | 'bowl') => {
        setMatchState(prev => ({ ...prev, tossChoice: choice }));
    };

    const startMatch = () => {
        const { tossWinner, tossChoice } = matchState;
        if (!tossWinner || !tossChoice) return;

        let battingTeam: 'A' | 'B', fieldingTeam: 'A' | 'B';
        if (tossWinner === 'A') {
            battingTeam = tossChoice === 'bat' ? 'A' : 'B';
        } else {
            battingTeam = tossChoice === 'bat' ? 'B' : 'A';
        }
        fieldingTeam = battingTeam === 'A' ? 'B' : 'A';

        setMatchState(prev => ({
            ...prev,
            innings: [createInningsTemplate(battingTeam, fieldingTeam), null],
            currentInningsIndex: 0,
            matchWinner: null,
            matchWinnerReason: '',
            screen: 'scoring'
        }));

        setHistory([]); // Reset undo
        setActivePrompt('striker'); // Trigger initial selection modals
    };

    // ==========================================
    // MODALS SELECTIONS COMPONENT HANDLERS
    // ==========================================
    const handlePlayerSelect = (playerName: string) => {
        const nextState = JSON.parse(JSON.stringify(matchState)) as MatchState;
        const curInnings = nextState.innings[nextState.currentInningsIndex]!;

        if (activePrompt === 'striker') {
            curInnings.currentStriker = playerName;
            initBatsmanStats(curInnings, playerName);
            setActivePrompt('nonStriker');
            setMatchState(nextState);
        } else if (activePrompt === 'nonStriker') {
            curInnings.currentNonStriker = playerName;
            initBatsmanStats(curInnings, playerName);
            setActivePrompt('bowler');
            setMatchState(nextState);
        } else if (activePrompt === 'bowler') {
            curInnings.currentBowler = playerName;
            initBowlerStats(curInnings, playerName);
            setActivePrompt(null);
            setMatchState(nextState);
        } else if (activePrompt === 'replacementStriker') {
            curInnings.currentStriker = playerName;
            initBatsmanStats(curInnings, playerName);
            setActivePrompt(null);
            setMatchState(checkInningsStatePostBall(nextState));
        } else if (activePrompt === 'replacementNonStriker') {
            curInnings.currentNonStriker = playerName;
            initBatsmanStats(curInnings, playerName);
            setActivePrompt(null);
            setMatchState(checkInningsStatePostBall(nextState));
        }
    };

    const initBatsmanStats = (innings: InningsData, name: string) => {
        if (!innings.batsmen[name]) {
            innings.batsmen[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: 'not out' };
        }
    };

    const initBowlerStats = (innings: InningsData, name: string) => {
        if (!innings.bowlers[name]) {
            innings.bowlers[name] = { runs: 0, balls: 0, maidens: 0, wickets: 0 };
        }
    };

    // ==========================================
    // KEYPAD ACTIONS & STATE MACHINE LOGIC
    // ==========================================
    const handleLegalRuns = (runs: number) => {
        pushHistory(matchState);

        setMatchState(prev => {
            const next = JSON.parse(JSON.stringify(prev)) as MatchState;
            const curInnings = next.innings[next.currentInningsIndex]!;
            const striker = curInnings.currentStriker!;
            const bowler = curInnings.currentBowler!;

            // Scoreboard update
            curInnings.runs += runs;
            curInnings.ballsBowled += 1;

            // Batsman
            curInnings.batsmen[striker].runs += runs;
            curInnings.batsmen[striker].balls += 1;
            if (runs === 4) {
                curInnings.batsmen[striker].fours += 1;
                triggerBoundaryVisuals('fours');
            } else if (runs === 6) {
                curInnings.batsmen[striker].sixes += 1;
                triggerBoundaryVisuals('sixes');
            }

            // Bowler
            curInnings.bowlers[bowler].balls += 1;
            curInnings.bowlers[bowler].runs += runs;
            curInnings.currentOverRuns += runs;

            // Over timeline symbol
            curInnings.currentOverTimeline.push({
                text: runs === 0 ? '•' : runs.toString(),
                type: runs === 4 || runs === 6 ? 'boundary' : 'legal'
            });

            // Strike rotation on odd runs
            if (runs === 1 || runs === 3) {
                const temp = curInnings.currentStriker;
                curInnings.currentStriker = curInnings.currentNonStriker;
                curInnings.currentNonStriker = temp;
            }

            return checkInningsStatePostBall(next);
        });
    };

    const handleWideExtraChoice = (addedRuns: number) => {
        pushHistory(matchState);

        setMatchState(prev => {
            const next = JSON.parse(JSON.stringify(prev)) as MatchState;
            const curInnings = next.innings[next.currentInningsIndex]!;
            const bowler = curInnings.currentBowler!;
            const totalExtraRuns = addedRuns + (prev.extraRunsPenalty ? 1 : 0); // Wide + running/byes + optional penalty

            curInnings.runs += totalExtraRuns;
            curInnings.extras.wide += totalExtraRuns;
            curInnings.extras.total += totalExtraRuns;

            curInnings.bowlers[bowler].runs += totalExtraRuns;
            curInnings.currentOverRuns += totalExtraRuns;

            const symbol = addedRuns === 0 ? 'Wd' : `Wd+${addedRuns}`;
            curInnings.currentOverTimeline.push({ text: symbol, type: 'extra' });

            if (addedRuns === 1 || addedRuns === 3) {
                const temp = curInnings.currentStriker;
                curInnings.currentStriker = curInnings.currentNonStriker;
                curInnings.currentNonStriker = temp;
            }

            return checkInningsStatePostBall(next);
        });
        setExtrasPrompt(null);
    };

    const handleNoBallExtraChoice = (addedRuns: number, scoreType: 'bat' | 'bye') => {
        pushHistory(matchState);

        setMatchState(prev => {
            const next = JSON.parse(JSON.stringify(prev)) as MatchState;
            const curInnings = next.innings[next.currentInningsIndex]!;
            const striker = curInnings.currentStriker!;
            const bowler = curInnings.currentBowler!;
            const totalRunsBall = addedRuns + (prev.extraRunsPenalty ? 1 : 0); // NB extra + batsman hit/bye + optional penalty

            curInnings.runs += totalRunsBall;
            curInnings.bowlers[bowler].runs += totalRunsBall;
            curInnings.currentOverRuns += totalRunsBall;

            curInnings.batsmen[striker].balls += 1;

            if (scoreType === 'bat') {
                curInnings.batsmen[striker].runs += addedRuns;
                if (addedRuns === 4) {
                    curInnings.batsmen[striker].fours += 1;
                    triggerBoundaryVisuals('fours');
                } else if (addedRuns === 6) {
                    curInnings.batsmen[striker].sixes += 1;
                    triggerBoundaryVisuals('sixes');
                }
                curInnings.extras.noBall += prev.extraRunsPenalty ? 1 : 0;
                curInnings.extras.total += prev.extraRunsPenalty ? 1 : 0;
            } else {
                curInnings.extras.noBall += prev.extraRunsPenalty ? 1 : 0;
                curInnings.extras.bye += addedRuns;
                curInnings.extras.total += totalRunsBall;
            }

            const symbol = addedRuns === 0 ? 'Nb' : `Nb+${addedRuns}`;
            curInnings.currentOverTimeline.push({ text: symbol, type: 'extra' });

            if (addedRuns === 1 || addedRuns === 3) {
                const temp = curInnings.currentStriker;
                curInnings.currentStriker = curInnings.currentNonStriker;
                curInnings.currentNonStriker = temp;
            }

            return checkInningsStatePostBall(next);
        });
        setExtrasPrompt(null);
    };

    const handleWicketDetailsSubmit = () => {
        pushHistory(matchState);

        const isStrikerOut = wicketWhoIsOut === 'striker';
        const dismissedBatsman = isStrikerOut ? matchState.innings[matchState.currentInningsIndex]!.currentStriker! : matchState.innings[matchState.currentInningsIndex]!.currentNonStriker!;

        setMatchState(prev => {
            const next = JSON.parse(JSON.stringify(prev)) as MatchState;
            const curInnings = next.innings[next.currentInningsIndex]!;
            const striker = curInnings.currentStriker!;
            const bowler = curInnings.currentBowler!;

            curInnings.ballsBowled += 1;
            curInnings.bowlers[bowler].balls += 1;
            curInnings.batsmen[striker].balls += 1; // faced this delivery
            curInnings.wickets += 1;

            // Formulation
            let dismissalStr = '';
            if (wicketDismissalType === 'Bowled') {
                dismissalStr = `b ${bowler}`;
                curInnings.bowlers[bowler].wickets += 1;
            } else if (wicketDismissalType === 'Caught') {
                dismissalStr = `c ${wicketFielder} b ${bowler}`;
                curInnings.bowlers[bowler].wickets += 1;
            } else if (wicketDismissalType === 'L.B.W') {
                dismissalStr = `lbw b ${bowler}`;
                curInnings.bowlers[bowler].wickets += 1;
            } else if (wicketDismissalType === 'Stumped') {
                dismissalStr = `st ${wicketFielder} b ${bowler}`;
                curInnings.bowlers[bowler].wickets += 1;
            } else if (wicketDismissalType === 'Hit Wicket') {
                dismissalStr = `hit wicket b ${bowler}`;
                curInnings.bowlers[bowler].wickets += 1;
            } else if (wicketDismissalType === 'Run Out') {
                dismissalStr = `run out (${wicketFielder})`;
            }

            curInnings.batsmen[dismissedBatsman].out = true;
            curInnings.batsmen[dismissedBatsman].dismissal = dismissalStr;

            const overStr = Math.floor(curInnings.ballsBowled / 6) + '.' + (curInnings.ballsBowled % 6);
            curInnings.fallOfWickets.push({
                score: curInnings.runs,
                wickets: curInnings.wickets,
                overs: overStr,
                batsmanOut: dismissedBatsman
            });

            curInnings.currentOverTimeline.push({ text: 'W', type: 'wicket' });

            const isAllOut = curInnings.wickets === prev.teamSize - 1;
            if (isAllOut) {
                return checkInningsStatePostBall(next);
            } else {
                // If not all out, trigger prompt replacement batsman modal on state load
                setTimeout(() => {
                    setActivePrompt(isStrikerOut ? 'replacementStriker' : 'replacementNonStriker');
                }, 50);
                return next;
            }
        });

        setWicketPrompt(false);
    };

    const checkInningsStatePostBall = (next: MatchState): MatchState => {
        const curInnings = next.innings[next.currentInningsIndex]!;
        const isSecondInnings = next.currentInningsIndex === 1;

        // 1. Target chased
        if (isSecondInnings && curInnings.target !== null && curInnings.runs >= curInnings.target) {
            return triggerMatchEnd(next);
        }

        // 2. All Out
        const totalWicketsPossible = next.teamSize - 1;
        const isAllOut = curInnings.wickets === totalWicketsPossible;

        // 3. Overs completed
        const isOversLimit = curInnings.ballsBowled >= next.totalOvers * 6;

        if (isAllOut || isOversLimit) {
            if (!isSecondInnings) {
                return triggerInnings1Complete(next);
            } else {
                return triggerMatchEnd(next);
            }
        }

        // 4. Over completion
        const isOverComplete = curInnings.ballsBowled > 0 && curInnings.ballsBowled % 6 === 0;
        if (isOverComplete && curInnings.currentOverTimeline.length > 0) {
            // Check maiden
            if (curInnings.currentOverRuns === 0) {
                curInnings.bowlers[curInnings.currentBowler!].maidens += 1;
                showToast('🌸 Maiden Over!');
            }

            // End-of-over strike rotation
            const temp = curInnings.currentStriker;
            curInnings.currentStriker = curInnings.currentNonStriker;
            curInnings.currentNonStriker = temp;

            // Reset over states
            curInnings.lastBowler = curInnings.currentBowler;
            curInnings.currentBowler = null;
            curInnings.currentOverTimeline = [];
            curInnings.currentOverRuns = 0;

            // Open Bowler prompt
            setTimeout(() => setActivePrompt('bowler'), 50);
        }

        return next;
    };

    const triggerInnings1Complete = (next: MatchState): MatchState => {
        const i1 = next.innings[0]!;
        const target = i1.runs + 1;
        
        // Prepare innings 2
        next.innings[1] = createInningsTemplate(i1.fieldingTeam, i1.battingTeam, target);
        next.screen = 'transition';
        return next;
    };

    const triggerMatchEnd = (next: MatchState): MatchState => {
        const i1 = next.innings[0]!;
        const i2 = next.innings[1]!;

        let winner: 'A' | 'B' | null = null;
        let reason = '';

        if (i2.runs >= i2.target!) {
            const batCode = i2.battingTeam;
            const winningTeamName = batCode === 'A' ? next.teamAName : next.teamBName;
            const wicketsLeft = next.teamSize - 1 - i2.wickets;
            winner = batCode;
            reason = `${winningTeamName} won by ${wicketsLeft} wickets! 🎉`;
        } else {
            if (i2.runs === i1.runs) {
                reason = `Match Tied! What an absolute thriller! 🤝`;
            } else {
                const winningTeamName = i2.fieldingTeam === 'A' ? next.teamAName : next.teamBName;
                const runsMargin = i1.runs - i2.runs;
                winner = i2.fieldingTeam;
                reason = `${winningTeamName} won by ${runsMargin} runs! 🎉`;
            }
        }

        next.matchWinner = winner;
        next.matchWinnerReason = reason;
        next.screen = 'scorecard';
        return next;
    };

    const startSecondInnings = () => {
        setMatchState(prev => ({
            ...prev,
            currentInningsIndex: 1,
            screen: 'scoring'
        }));
        setHistory([]); // reset undo for innings 2
        setActivePrompt('striker');
    };

    const restartMatch = () => {
        setMatchState(getInitialMatchState());
        setHistory([]);
        setActiveRosterTab('A');
        setActiveScorecardTab(0);
    };

    // ==========================================
    // DESIGN VISUAL EFFECTS AND confetti
    // ==========================================
    const triggerBoundaryVisuals = (type: 'fours' | 'sixes') => {
        const colors = type === 'sixes' ? ['#f59e0b', '#3b82f6', '#10b981'] : ['#22c55e', '#a855f7'];
        const count = type === 'sixes' ? 40 : 25;
        
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.style.position = 'fixed';
            p.style.bottom = '40%';
            p.style.left = '50%';
            p.style.width = Math.random() * 8 + 6 + 'px';
            p.style.height = Math.random() * 12 + 6 + 'px';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            p.style.zIndex = '1500';
            p.style.borderRadius = '2px';
            p.style.transform = `rotate(${Math.random() * 360}deg)`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 15 + 8;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity - 10;
            
            document.body.appendChild(p);

            let curX = window.innerWidth / 2;
            let curY = window.innerHeight * 0.4;
            let currVx = vx;
            let currVy = vy;

            const animateParticle = () => {
                currVy += 0.8;
                curX += currVx;
                curY += currVy;
                p.style.left = curX + 'px';
                p.style.top = curY + 'px';

                if (curY < window.innerHeight && curX > 0 && curX < window.innerWidth) {
                    requestAnimationFrame(animateParticle);
                } else {
                    p.remove();
                }
            };
            requestAnimationFrame(animateParticle);
        }
    };

    const saveScorecardImage = () => {
        const i1 = matchState.innings[0]!;
        const i2 = matchState.innings[1];

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 800;
        canvas.height = i2 ? 1400 : 850;

        // Background Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Outfit, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRICSCOREPRO - MATCH REPORT', canvas.width / 2, 60);

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(100, 80);
        ctx.lineTo(700, 80);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.fillText(matchState.matchWinnerReason || 'Match Complete', canvas.width / 2, 125);

        const drawInnings = (inn: InningsData, yOffset: number, title: string) => {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.fillRect(40, yOffset, canvas.width - 80, 45);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.strokeRect(40, yOffset, canvas.width - 80, 45);

            ctx.textAlign = 'left';
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 18px Outfit, sans-serif';
            ctx.fillText(title, 55, yOffset + 28);

            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Outfit, sans-serif';
            ctx.fillText(`${inn.runs}/${inn.wickets} (${Math.floor(inn.ballsBowled / 6)}.${inn.ballsBowled % 6} Ov)`, canvas.width - 55, yOffset + 28);

            let rowY = yOffset + 75;
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('BATSMAN', 50, rowY);
            ctx.fillText('DISMISSAL', 220, rowY);
            ctx.textAlign = 'right';
            ctx.fillText('R', 530, rowY);
            ctx.fillText('B', 600, rowY);
            ctx.fillText('4s', 660, rowY);
            ctx.fillText('6s', 710, rowY);
            ctx.fillText('SR', 760, rowY);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '13px Inter, sans-serif';
            const squad = inn.battingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers;
            
            squad.forEach(p => {
                rowY += 28;
                const stats = inn.batsmen[p];
                ctx.textAlign = 'left';
                ctx.fillStyle = stats ? '#ffffff' : '#64748b';
                ctx.fillText(p, 50, rowY);

                if (!stats) {
                    ctx.fillStyle = '#64748b';
                    ctx.fillText('Did not bat', 220, rowY);
                    ctx.textAlign = 'right';
                    ctx.fillText('-', 530, rowY);
                    ctx.fillText('-', 600, rowY);
                    ctx.fillText('-', 660, rowY);
                    ctx.fillText('-', 710, rowY);
                    ctx.fillText('-', 760, rowY);
                } else {
                    ctx.fillStyle = '#94a3b8';
                    const dismissalClean = stats.dismissal.replace(/<[^>]*>/g, '');
                    ctx.fillText(stats.out ? dismissalClean : 'not out', 220, rowY);
                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(stats.runs.toString(), 530, rowY);
                    ctx.fillStyle = '#94a3b8';
                    ctx.fillText(stats.balls.toString(), 600, rowY);
                    ctx.fillText(stats.fours.toString(), 660, rowY);
                    ctx.fillText(stats.sixes.toString(), 710, rowY);
                    const sr = stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : '0.0';
                    ctx.fillText(sr, 760, rowY);
                }
            });

            rowY += 30;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#64748b';
            ctx.font = 'italic 13px Inter, sans-serif';
            ctx.fillText(`Extras: ${inn.extras.total} (wd ${inn.extras.wide}, nb ${inn.extras.noBall}, b/lb ${inn.extras.bye})`, 50, rowY);

            rowY += 40;
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('BOWLER', 50, rowY);
            ctx.textAlign = 'right';
            ctx.fillText('O', 500, rowY);
            ctx.fillText('M', 570, rowY);
            ctx.fillText('R', 640, rowY);
            ctx.fillText('W', 700, rowY);
            ctx.fillText('ECON', 760, rowY);

            ctx.font = '13px Inter, sans-serif';
            Object.keys(inn.bowlers).forEach(bName => {
                rowY += 28;
                const b = inn.bowlers[bName];
                ctx.textAlign = 'left';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(bName, 50, rowY);
                
                ctx.textAlign = 'right';
                ctx.fillStyle = '#94a3b8';
                const oversStr = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
                ctx.fillText(oversStr, 500, rowY);
                ctx.fillText(b.maidens.toString(), 570, rowY);
                ctx.fillText(b.runs.toString(), 640, rowY);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(b.wickets.toString(), 700, rowY);
                const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(econ, 760, rowY);
            });
            return rowY;
        };

        const team1Name = i1.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName;
        const endY1 = drawInnings(i1, 160, `${team1Name.toUpperCase()} INNINGS`);

        if (i2) {
            const team2Name = i2.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName;
            drawInnings(i2, endY1 + 50, `${team2Name.toUpperCase()} INNINGS`);
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText('Generated by CricScorePro Scorecard System', canvas.width / 2, canvas.height - 25);

        try {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `cricscore_${matchState.teamAName}_vs_${matchState.teamBName}.png`;
            link.href = dataUrl;
            link.click();
            showToast('📥 Scorecard Image saved!');
        } catch (e) {
            showToast('Error saving scorecard image.');
        }
    };

    // ==========================================
    // RENDERING HELPERS / SUBVIEWS
    // ==========================================
    const curInnings = matchState.innings[matchState.currentInningsIndex]!;
    
    // Players available for batting selection
    const getAvailableBatsmen = () => {
        if (!curInnings) return [];
        const allPlayers = curInnings.battingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers;
        const active = [curInnings.currentStriker, curInnings.currentNonStriker];
        const dismissed = Object.keys(curInnings.batsmen).filter(name => curInnings.batsmen[name].out);
        return allPlayers.filter(p => !active.includes(p) && !dismissed.includes(p));
    };

    // Players available for bowling selection
    const getAvailableBowlers = () => {
        if (!curInnings) return [];
        const allPlayers = curInnings.fieldingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers;
        return allPlayers.filter(p => p !== curInnings.lastBowler);
    };

    return (
        <div className="app-container">
            {/* HEADER */}
            <header className="app-header">
                <div className="logo">
                    <span className="logo-icon">🏏</span>
                    <span className="logo-text">CricScore<span className="logo-accent">Pro</span></span>
                </div>
                <div className="theme-toggle-container">
                    <button 
                        onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                        className="icon-btn" 
                        aria-label="Toggle Theme"
                    >
                        <span className="sun-icon">☀️</span>
                        <span className="moon-icon">🌙</span>
                    </button>
                </div>
            </header>

            <main className="app-main">
                {/* 1. CONFIGURATION SCREEN */}
                {matchState.screen === 'setup' && (
                    <section className="screen active">
                        <div className="card glassmorphism animate-fade-in">
                            <h2 className="section-title">Match Configuration</h2>
                            <p className="section-subtitle">Set up your match parameters to begin tracking.</p>
                            
                            <form onSubmit={handleSetupSubmit}>
                                <div className="form-group">
                                    <label htmlFor="team-size">Players per Team</label>
                                    <input 
                                        type="number" 
                                        id="team-size" 
                                        min="2" 
                                        max="15" 
                                        value={matchState.teamSize} 
                                        onChange={e => setMatchState(prev => ({ ...prev, teamSize: parseInt(e.target.value) || 0 }))}
                                        required 
                                    />
                                    <span className="input-hint">Minimum 2, Maximum 15 players</span>
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="match-overs">Overs per Innings</label>
                                    <input 
                                        type="number" 
                                        id="match-overs" 
                                        min="1" 
                                        max="50" 
                                        value={matchState.totalOvers} 
                                        onChange={e => setMatchState(prev => ({ ...prev, totalOvers: parseInt(e.target.value) || 0 }))}
                                        required 
                                    />
                                    <span className="input-hint">Set the length of each innings</span>
                                </div>

                                <div className="form-group mt-3">
                                    <label>Penalty Run for Extras (Wide/No-Ball)</label>
                                    <div className="grid-2 mt-1">
                                        <button 
                                            type="button"
                                            onClick={() => setMatchState(prev => ({ ...prev, extraRunsPenalty: true }))}
                                            className={`btn btn-outline ${matchState.extraRunsPenalty ? 'active' : ''}`}
                                        >
                                            Yes (+1 Run)
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setMatchState(prev => ({ ...prev, extraRunsPenalty: false }))}
                                            className={`btn btn-outline ${!matchState.extraRunsPenalty ? 'active' : ''}`}
                                        >
                                            No (0 Runs)
                                        </button>
                                    </div>
                                    <span className="input-hint">Enable standard ICC +1 extra run penalty, or disable it for Gully Cricket.</span>
                                </div>

                                <div className="grid-2">
                                    <div className="form-group">
                                        <label htmlFor="team-a-name">Team A Name</label>
                                        <input 
                                            type="text" 
                                            id="team-a-name" 
                                            value={matchState.teamAName} 
                                            onChange={e => setMatchState(prev => ({ ...prev, teamAName: e.target.value }))}
                                            placeholder="e.g. Strikers" 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="team-b-name">Team B Name</label>
                                        <input 
                                            type="text" 
                                            id="team-b-name" 
                                            value={matchState.teamBName} 
                                            onChange={e => setMatchState(prev => ({ ...prev, teamBName: e.target.value }))}
                                            placeholder="e.g. Blasters" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary btn-block mt-3">
                                    Configure Teams ➡️
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                {/* 2. PLAYER ROSTERS SCREEN */}
                {matchState.screen === 'players' && (
                    <section className="screen active">
                        <div className="card glassmorphism animate-fade-in">
                            <div className="card-header-actions">
                                <h2 className="section-title">Player Rosters</h2>
                                <button type="button" onClick={handleQuickFill} className="btn btn-secondary btn-sm">⚡ Quick Fill</button>
                            </div>
                            <p className="section-subtitle">Enter the names of all playing squad members.</p>

                            <div className="tabs-container">
                                <div className="tabs-header">
                                    <button 
                                        type="button" 
                                        className={`tab-btn ${activeRosterTab === 'A' ? 'active' : ''}`}
                                        onClick={() => setActiveRosterTab('A')}
                                    >
                                        {matchState.teamAName}
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`tab-btn ${activeRosterTab === 'B' ? 'active' : ''}`}
                                        onClick={() => setActiveRosterTab('B')}
                                    >
                                        {matchState.teamBName}
                                    </button>
                                </div>

                                <div className="tabs-content">
                                    <div className={`tab-pane ${activeRosterTab === 'A' ? 'active' : ''}`}>
                                        <div className="player-inputs-list">
                                            {matchState.teamAPlayers.map((player, idx) => (
                                                <div key={idx} className="player-input-row">
                                                    <span className="player-index">{idx + 1}</span>
                                                    <input 
                                                        type="text" 
                                                        value={player} 
                                                        onChange={e => handlePlayerNameChange('A', idx, e.target.value)}
                                                        placeholder={`Player ${idx + 1}`} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`tab-pane ${activeRosterTab === 'B' ? 'active' : ''}`}>
                                        <div className="player-inputs-list">
                                            {matchState.teamBPlayers.map((player, idx) => (
                                                <div key={idx} className="player-input-row">
                                                    <span className="player-index">{idx + 1}</span>
                                                    <input 
                                                        type="text" 
                                                        value={player} 
                                                        onChange={e => handlePlayerNameChange('B', idx, e.target.value)}
                                                        placeholder={`Player ${idx + 1}`} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="checkbox-container">
                                <input 
                                    type="checkbox" 
                                    id="save-rosters" 
                                    checked={saveRoster} 
                                    onChange={e => setSaveRoster(e.target.checked)}
                                />
                                <label htmlFor="save-rosters" className="checkbox-label">
                                    💾 Save teams and players for future matches
                                </label>
                            </div>

                            <div className="action-footer grid-2 mt-4">
                                <button type="button" onClick={() => setMatchState(prev => ({ ...prev, screen: 'setup' }))} className="btn btn-outline">Back</button>
                                <button type="button" onClick={handlePlayersSubmit} className="btn btn-primary">Proceed to Toss 🪙</button>
                            </div>
                        </div>
                    </section>
                )}

                {/* 3. TOSS SCREEN */}
                {matchState.screen === 'toss' && (
                    <section className="screen active">
                        <div className="card glassmorphism animate-fade-in text-center">
                            <h2 className="section-title">The Coin Toss</h2>
                            <p className="section-subtitle">Who won the toss and what is their choice?</p>

                            <div className="toss-container">
                                {/* Simulated Coin Flip */}
                                <div className="coin-container">
                                    <h3>Simulate Coin Flip 🪙</h3>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', margin: '4px 0', flexWrap: 'wrap' }}>
                                        <label style={{ margin: 0, fontSize: '0.8rem' }}>Caller:</label>
                                        <select 
                                            value={tossCaller} 
                                            onChange={e => setTossCaller(e.target.value as 'A' | 'B')}
                                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                        >
                                            <option value="A">{matchState.teamAName}</option>
                                            <option value="B">{matchState.teamBName}</option>
                                        </select>
                                        
                                        <label style={{ margin: 0, fontSize: '0.8rem', marginLeft: '12px' }}>Call:</label>
                                        <button 
                                            type="button"
                                            onClick={() => setTossCall(prev => prev === 'heads' ? 'tails' : 'heads')}
                                            className="btn btn-outline btn-sm"
                                            style={{ textTransform: 'uppercase', minWidth: '80px' }}
                                        >
                                            {tossCall}
                                        </button>
                                    </div>

                                    <div className="coin-wrapper">
                                        <div 
                                            className={`coin ${isFlipping ? 'flipping' : ''}`}
                                            style={{ 
                                                transform: isFlipping ? undefined : (flipResult === 'tails' ? 'rotateY(180deg)' : 'rotateY(0deg)') 
                                            }}
                                        >
                                            <div className="coin-side coin-heads">H</div>
                                            <div className="coin-side coin-tails">T</div>
                                        </div>
                                    </div>

                                    <button 
                                        type="button" 
                                        onClick={handleCoinFlip} 
                                        className="btn btn-primary btn-sm btn-block"
                                        disabled={isFlipping}
                                    >
                                        {isFlipping ? 'Flipping...' : 'Flip Coin 🪙'}
                                    </button>
                                </div>

                                <div className="toss-winner-section">
                                    <h3>Toss Winner</h3>
                                    <div className="toss-winner-options grid-2">
                                        <button 
                                            type="button" 
                                            onClick={() => handleTossWinnerSelect('A')} 
                                            className={`btn btn-outline select-card ${matchState.tossWinner === 'A' ? 'active' : ''}`}
                                        >
                                            {matchState.teamAName}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleTossWinnerSelect('B')} 
                                            className={`btn btn-outline select-card ${matchState.tossWinner === 'B' ? 'active' : ''}`}
                                        >
                                            {matchState.teamBName}
                                        </button>
                                    </div>
                                </div>

                                <div className="toss-choice-section mt-4">
                                    <h3>Toss Winner Elected To</h3>
                                    <div className="toss-choice-options grid-2">
                                        <button 
                                            type="button" 
                                            onClick={() => handleTossChoiceSelect('bat')} 
                                            className={`btn btn-outline select-card-icon ${matchState.tossChoice === 'bat' ? 'active' : ''}`}
                                        >
                                            <span className="card-icon">🏏</span>
                                            <span>BAT</span>
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => handleTossChoiceSelect('bowl')} 
                                            className={`btn btn-outline select-card-icon ${matchState.tossChoice === 'bowl' ? 'active' : ''}`}
                                        >
                                            <span className="card-icon">⚾</span>
                                            <span>BOWL</span>
                                        </button>
                                    </div>
                                </div>
                                
                                {matchState.tossWinner && matchState.tossChoice && (
                                    <div className="toss-summary-box mt-4 animate-fade-in">
                                        🪙 <strong>{matchState.tossWinner === 'A' ? matchState.teamAName : matchState.teamBName}</strong> won the toss and elected to <strong>{matchState.tossChoice.toUpperCase()}</strong> first.<br/>
                                        Innings 1 Batting: <strong>{matchState.tossWinner === 'A' ? (matchState.tossChoice === 'bat' ? matchState.teamAName : matchState.teamBName) : (matchState.tossChoice === 'bat' ? matchState.teamBName : matchState.teamAName)}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="action-footer grid-2 mt-4">
                                <button type="button" onClick={() => setMatchState(prev => ({ ...prev, screen: 'players' }))} className="btn btn-outline">Back</button>
                                <button 
                                    type="button" 
                                    onClick={startMatch} 
                                    className={`btn btn-success btn-block ${(!matchState.tossWinner || !matchState.tossChoice) ? 'disabled' : ''}`}
                                    disabled={!matchState.tossWinner || !matchState.tossChoice}
                                >
                                    Start Match 🚀
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. TRANSITION SCREEN */}
                {matchState.screen === 'transition' && (
                    <section className="screen active">
                        <div className="card glassmorphism animate-fade-in text-center">
                            <h2 className="section-title">Innings Complete!</h2>
                            
                            <div className="innings-summary-card mt-4">
                                <h3>{matchState.innings[0]!.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName} Innings</h3>
                                <div className="huge-score">{matchState.innings[0]!.runs}/{matchState.innings[0]!.wickets}</div>
                                <div className="detail-text">
                                    in {Math.floor(matchState.innings[0]!.ballsBowled / 6)}.{matchState.innings[0]!.ballsBowled % 6} overs
                                </div>
                            </div>

                            <div className="chase-target-card mt-4">
                                <p className="target-label">Target for Innings 2</p>
                                <div className="target-score">{matchState.innings[1]!.target} runs</div>
                                <p className="target-requirement">
                                    {matchState.innings[1]!.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName} needs {matchState.innings[1]!.target} runs in {matchState.totalOvers} overs to win.
                                </p>
                            </div>

                            <div className="action-footer mt-4">
                                <button type="button" onClick={startSecondInnings} className="btn btn-primary btn-block">
                                    Start Second Innings 🏏
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* 5. LIVE SCORING DASHBOARD SCREEN */}
                {matchState.screen === 'scoring' && curInnings && (
                    <section className="screen active">
                        {/* SCOREBOARD STATUS HEADER */}
                        <div className="scoreboard-card glassmorphism">
                            <div className="scoreboard-header">
                                <div className="match-info">
                                    <span>Innings {matchState.currentInningsIndex + 1}</span>
                                    <span className="badge">BAT</span>
                                </div>
                                {curInnings.target !== null && (
                                    <div className="target-info">
                                        Target: <span>{curInnings.target}</span>
                                    </div>
                                )}
                            </div>

                            <div className="scoreboard-main">
                                <div className="score-display">
                                    <h1>{curInnings.runs}/{curInnings.wickets}</h1>
                                    <span>{Math.floor(curInnings.ballsBowled / 6)}.{curInnings.ballsBowled % 6} Overs</span>
                                </div>
                                <div className="runs-math-display">
                                    <div className="run-rate-box">
                                        <span className="lbl">CRR</span>
                                        <span className="val">{(curInnings.ballsBowled > 0 ? (curInnings.runs / (curInnings.ballsBowled / 6)) : 0).toFixed(2)}</span>
                                    </div>
                                    {curInnings.target !== null && (
                                        <div className="run-rate-box">
                                            <span className="lbl">RRR</span>
                                            <span className="val">
                                                {((matchState.totalOvers * 6 - curInnings.ballsBowled) > 0 
                                                    ? (((curInnings.target - curInnings.runs) / (matchState.totalOvers * 6 - curInnings.ballsBowled)) * 6) 
                                                    : 0).toFixed(2)
                                                }
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {curInnings.target !== null && (curInnings.target - curInnings.runs > 0) && (
                                <div className="scoreboard-footer text-center">
                                    🎯 <strong>{curInnings.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName}</strong> needs <strong>{curInnings.target - curInnings.runs}</strong> runs off <strong>{matchState.totalOvers * 6 - curInnings.ballsBowled}</strong> balls
                                </div>
                            )}
                        </div>

                        {/* BATSMEN STATUS */}
                        <div className="players-live-card glassmorphism mt-3">
                            <div className="card-title-small">Batting</div>
                            <div className="batsmen-live-list">
                                {/* Striker */}
                                {curInnings.currentStriker && (
                                    <div className="batsman-row active">
                                        <div className="batsman-name-col">
                                            <span className="striker-dot">🏏</span>
                                            <span className="p-name">{curInnings.currentStriker}</span>
                                        </div>
                                        <div className="batsman-stats-col">
                                            <span className="p-runs">{curInnings.batsmen[curInnings.currentStriker]?.runs || 0}</span>
                                            <span className="p-divider">(</span>
                                            <span className="p-balls">{curInnings.batsmen[curInnings.currentStriker]?.balls || 0}</span>
                                            <span className="p-divider">)</span>
                                            <div className="sub-stats">
                                                <span>4s: <strong>{curInnings.batsmen[curInnings.currentStriker]?.fours || 0}</strong></span>
                                                <span>6s: <strong>{curInnings.batsmen[curInnings.currentStriker]?.sixes || 0}</strong></span>
                                                <span>SR: <strong>
                                                    {(curInnings.batsmen[curInnings.currentStriker]?.balls > 0 
                                                        ? ((curInnings.batsmen[curInnings.currentStriker].runs / curInnings.batsmen[curInnings.currentStriker].balls) * 100) 
                                                        : 0).toFixed(1)
                                                    }
                                                </strong></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {/* Non-striker */}
                                {curInnings.currentNonStriker && (
                                    <div className="batsman-row">
                                        <div className="batsman-name-col">
                                            <span className="striker-dot"></span>
                                            <span className="p-name">{curInnings.currentNonStriker}</span>
                                        </div>
                                        <div className="batsman-stats-col">
                                            <span className="p-runs">{curInnings.batsmen[curInnings.currentNonStriker]?.runs || 0}</span>
                                            <span className="p-divider">(</span>
                                            <span className="p-balls">{curInnings.batsmen[curInnings.currentNonStriker]?.balls || 0}</span>
                                            <span className="p-divider">)</span>
                                            <div className="sub-stats">
                                                <span>4s: <strong>{curInnings.batsmen[curInnings.currentNonStriker]?.fours || 0}</strong></span>
                                                <span>6s: <strong>{curInnings.batsmen[curInnings.currentNonStriker]?.sixes || 0}</strong></span>
                                                <span>SR: <strong>
                                                    {(curInnings.batsmen[curInnings.currentNonStriker]?.balls > 0 
                                                        ? ((curInnings.batsmen[curInnings.currentNonStriker].runs / curInnings.batsmen[curInnings.currentNonStriker].balls) * 100) 
                                                        : 0).toFixed(1)
                                                    }
                                                </strong></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* BOWLER STATUS */}
                        <div className="players-live-card glassmorphism mt-3">
                            <div className="card-title-small">Bowling</div>
                            {curInnings.currentBowler && (
                                <div className="bowler-live-row">
                                    <div className="bowler-name-col">
                                        <span className="bowler-icon">⚾</span>
                                        <span className="p-name">{curInnings.currentBowler}</span>
                                    </div>
                                    <div className="bowler-stats-col">
                                        <div className="bowler-numbers">
                                            <span>{curInnings.bowlers[curInnings.currentBowler]?.wickets || 0}</span> W
                                            <span className="lbl-divider">for</span>
                                            <span>{curInnings.bowlers[curInnings.currentBowler]?.runs || 0}</span> R
                                        </div>
                                        <div className="sub-stats">
                                            <span>Overs: <strong>{Math.floor((curInnings.bowlers[curInnings.currentBowler]?.balls || 0) / 6)}.{ (curInnings.bowlers[curInnings.currentBowler]?.balls || 0) % 6 }</strong></span>
                                            <span>Econ: <strong>
                                                {(curInnings.bowlers[curInnings.currentBowler]?.balls > 0 
                                                    ? ((curInnings.bowlers[curInnings.currentBowler].runs / (curInnings.bowlers[curInnings.currentBowler].balls / 6))) 
                                                    : 0).toFixed(2)
                                                }
                                            </strong></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* OVER TIMELINE */}
                        <div className="over-timeline-container glassmorphism mt-3">
                            <div className="timeline-header">
                                <span>This Over:</span>
                                <div className="extras-counter">
                                    Extras: <span>{curInnings.extras.total} (Wd:{curInnings.extras.wide}, Nb:{curInnings.extras.noBall}, B:{curInnings.extras.bye})</span>
                                </div>
                            </div>
                            <div className="timeline-balls">
                                {curInnings.currentOverTimeline.map((ball, idx) => (
                                    <span key={idx} className={`ball-badge font-${ball.type}`}>
                                        {ball.text}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* KEYPAD SCORING INTERACTION */}
                        <div className="keypad-card glassmorphism mt-3">
                            <div className="keypad-grid">
                                <button type="button" onClick={() => handleLegalRuns(0)} className="keypad-btn btn-dot">0</button>
                                <button type="button" onClick={() => handleLegalRuns(1)} className="keypad-btn">1</button>
                                <button type="button" onClick={() => handleLegalRuns(2)} className="keypad-btn">2</button>
                                <button type="button" onClick={() => handleLegalRuns(3)} className="keypad-btn">3</button>
                                <button type="button" onClick={() => handleLegalRuns(4)} className="keypad-btn btn-boundary">4</button>
                                <button type="button" onClick={() => handleLegalRuns(6)} className="keypad-btn btn-boundary">6</button>
                                <button type="button" onClick={() => setExtrasPrompt('wide')} className="keypad-btn btn-extra">Wide</button>
                                <button type="button" onClick={() => setExtrasPrompt('noBall')} className="keypad-btn btn-extra">No Ball</button>
                                <button type="button" onClick={() => setWicketPrompt(true)} className="keypad-btn btn-wicket">Wicket</button>
                            </div>

                            <div className="keypad-footer mt-3">
                                <button type="button" onClick={handleUndo} className="btn btn-outline btn-block btn-sm">
                                    ↩️ Undo Last Ball
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* 6. FINAL SCORECARD SCREEN */}
                {matchState.screen === 'scorecard' && (
                    <section className="screen active">
                        <div className="card glassmorphism animate-fade-in">
                            <div className="match-conclusion-header text-center">
                                <div className="trophy-animation">🏆</div>
                                <h2>{matchState.matchWinnerReason}</h2>
                                <p className="section-subtitle">Match Summary and Detailed Stats</p>
                            </div>

                            <div className="tabs-container mt-4">
                                <div className="tabs-header">
                                    <button 
                                        type="button" 
                                        className={`tab-btn ${activeScorecardTab === 0 ? 'active' : ''}`}
                                        onClick={() => setActiveScorecardTab(0)}
                                    >
                                        {matchState.innings[0]!.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName}
                                    </button>
                                    {matchState.innings[1] && (
                                        <button 
                                            type="button" 
                                            className={`tab-btn ${activeScorecardTab === 1 ? 'active' : ''}`}
                                            onClick={() => setActiveScorecardTab(1)}
                                        >
                                            {matchState.innings[1].battingTeam === 'A' ? matchState.teamAName : matchState.teamBName}
                                        </button>
                                    )}
                                </div>

                                <div className="tabs-content">
                                    {matchState.innings.map((innings, innIdx) => {
                                        if (!innings) return null;
                                        const battingTeamName = innings.battingTeam === 'A' ? matchState.teamAName : matchState.teamBName;
                                        const squad = innings.battingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers;

                                        return (
                                            <div key={innIdx} className={`tab-pane ${activeScorecardTab === innIdx ? 'active' : ''}`}>
                                                <div className="innings-title-summary">
                                                    <h4>{battingTeamName}</h4>
                                                    <span className="scorecard-total-badge">
                                                        {innings.runs}/{innings.wickets} ({Math.floor(innings.ballsBowled / 6)}.{innings.ballsBowled % 6} Ov)
                                                    </span>
                                                </div>
                                                <div className="table-responsive">
                                                    <table className="scorecard-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Batsman</th>
                                                                <th>Dismissal</th>
                                                                <th className="text-right">R</th>
                                                                <th className="text-right">B</th>
                                                                <th className="text-right">4s</th>
                                                                <th className="text-right">6s</th>
                                                                <th className="text-right">SR</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {squad.map((player) => {
                                                                const stats = innings.batsmen[player];
                                                                if (!stats) {
                                                                    return (
                                                                        <tr key={player}>
                                                                            <td><strong>{player}</strong></td>
                                                                            <td><span style={{ color: 'var(--text-muted)' }}>Did not bat</span></td>
                                                                            <td className="text-right">-</td>
                                                                            <td className="text-right">-</td>
                                                                            <td className="text-right">-</td>
                                                                            <td className="text-right">-</td>
                                                                            <td className="text-right">-</td>
                                                                        </tr>
                                                                    );
                                                                }
                                                                return (
                                                                    <tr key={player}>
                                                                        <td><strong>{player}</strong></td>
                                                                        <td>
                                                                            {stats.out ? (
                                                                                <span dangerouslySetInnerHTML={{ __html: stats.dismissal }} />
                                                                            ) : (
                                                                                <strong>not out</strong>
                                                                            )}
                                                                        </td>
                                                                        <td className="text-right"><strong>{stats.runs}</strong></td>
                                                                        <td className="text-right">{stats.balls}</td>
                                                                        <td className="text-right">{stats.fours}</td>
                                                                        <td className="text-right">{stats.sixes}</td>
                                                                        <td className="text-right">
                                                                            {(stats.balls > 0 ? ((stats.runs / stats.balls) * 100) : 0).toFixed(1)}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="extras-scorecard-row">
                                                    Extras: {innings.extras.total} (wd {innings.extras.wide}, nb {innings.extras.noBall}, b/lb {innings.extras.bye})
                                                </div>

                                                <div className="table-responsive mt-3">
                                                    <table className="scorecard-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Bowler</th>
                                                                <th className="text-right">O</th>
                                                                <th className="text-right">M</th>
                                                                <th className="text-right">R</th>
                                                                <th className="text-right">W</th>
                                                                <th className="text-right">Econ</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {Object.keys(innings.bowlers).map((bowler) => {
                                                                const stats = innings.bowlers[bowler];
                                                                const overs = `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`;
                                                                const econ = stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(2) : '0.00';
                                                                return (
                                                                    <tr key={bowler}>
                                                                        <td><strong>{bowler}</strong></td>
                                                                        <td className="text-right">{overs}</td>
                                                                        <td className="text-right">{stats.maidens}</td>
                                                                        <td className="text-right">{stats.runs}</td>
                                                                        <td className="text-right"><strong>{stats.wickets}</strong></td>
                                                                        <td className="text-right">{econ}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="action-footer mt-4">
                                <button type="button" onClick={saveScorecardImage} className="btn btn-success btn-block">
                                    📥 Save Scorecard Image
                                </button>
                            </div>

                            <div className="action-footer mt-2">
                                <button type="button" onClick={restartMatch} className="btn btn-primary btn-block">
                                    Track New Match 🔄
                                </button>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            {/* ==========================================
               MODALS OVERLAYS
               ========================================== */}
            
            {/* PLAYER SELECTION MODAL */}
            {activePrompt !== null && curInnings && (
                <div className="modal-overlay active">
                    <div className="modal-card glassmorphism">
                        <div className="modal-header">
                            <h3>
                                {activePrompt === 'striker' && `Select Striker`}
                                {activePrompt === 'nonStriker' && `Select Non-Striker`}
                                {activePrompt === 'bowler' && `Select Bowler`}
                                {activePrompt === 'replacementStriker' && `Select Striker Replacement`}
                                {activePrompt === 'replacementNonStriker' && `Select Non-Striker Replacement`}
                            </h3>
                        </div>
                        <div className="modal-body">
                            <p className="section-subtitle">
                                {activePrompt === 'striker' && `Who will take strike at the striker's end?`}
                                {activePrompt === 'nonStriker' && `Who will be at the non-striker's end?`}
                                {activePrompt === 'bowler' && `Choose a bowler for the over.`}
                                {activePrompt.startsWith('replacement') && `Select a player to replace the out batsman.`}
                            </p>
                            <div className="selection-options-list">
                                {activePrompt === 'striker' && 
                                    (curInnings.battingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers).map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => handlePlayerSelect(p)} 
                                            className="select-player-btn animate-fade-in"
                                        >
                                            <span>{p}</span>
                                            <span className="player-meta">Batsman</span>
                                        </button>
                                    ))
                                }
                                {activePrompt === 'nonStriker' && 
                                    (curInnings.battingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers)
                                        .filter(p => p !== curInnings.currentStriker)
                                        .map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => handlePlayerSelect(p)} 
                                                className="select-player-btn animate-fade-in"
                                            >
                                                <span>{p}</span>
                                                <span className="player-meta">Batsman</span>
                                            </button>
                                        ))
                                }
                                {(activePrompt === 'replacementStriker' || activePrompt === 'replacementNonStriker') && 
                                    getAvailableBatsmen().map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => handlePlayerSelect(p)} 
                                            className="select-player-btn animate-fade-in"
                                        >
                                            <span>{p}</span>
                                            <span className="player-meta">Batsman</span>
                                        </button>
                                    ))
                                }
                                {activePrompt === 'bowler' && 
                                    getAvailableBowlers().map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => handlePlayerSelect(p)} 
                                            className="select-player-btn animate-fade-in"
                                        >
                                            <span>{p}</span>
                                            <span className="player-meta">
                                                {curInnings.bowlers[p] 
                                                    ? `${Math.floor(curInnings.bowlers[p].balls / 6)}.${curInnings.bowlers[p].balls % 6} Ov, ${curInnings.bowlers[p].wickets} W`
                                                    : 'Bowl'
                                                }
                                            </span>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EXTRAS SUB-OPTIONS SELECTION MODAL */}
            {extrasPrompt !== null && (
                <div className="modal-overlay active">
                    <div className="modal-card glassmorphism">
                        <div className="modal-header">
                            <h3>Runs from {extrasPrompt === 'wide' ? 'Wide' : 'No Ball'}</h3>
                        </div>
                        <div className="modal-body text-center">
                            <p className="section-subtitle">Are there any additional runs scored off the delivery?</p>
                            
                            {extrasPrompt === 'wide' ? (
                                <div className="extras-options-grid mt-3">
                                    <button onClick={() => handleWideExtraChoice(0)} className="btn btn-outline extras-option-btn">Wide only (1 R)</button>
                                    <button onClick={() => handleWideExtraChoice(1)} className="btn btn-outline extras-option-btn">Wide + 1 (2 R)</button>
                                    <button onClick={() => handleWideExtraChoice(2)} className="btn btn-outline extras-option-btn">Wide + 2 (3 R)</button>
                                    <button onClick={() => handleWideExtraChoice(3)} className="btn btn-outline extras-option-btn">Wide + 3 (4 R)</button>
                                    <button onClick={() => handleWideExtraChoice(4)} className="btn btn-outline extras-option-btn">Wide + 4 (5 R)</button>
                                </div>
                            ) : (
                                <div className="extras-options-grid mt-3">
                                    <button onClick={() => handleNoBallExtraChoice(0, 'bat')} className="btn btn-outline extras-option-btn">No Runs (1 R)</button>
                                    <button onClick={() => handleNoBallExtraChoice(1, 'bat')} className="btn btn-outline extras-option-btn">1 Run (Bat)</button>
                                    <button onClick={() => handleNoBallExtraChoice(2, 'bat')} className="btn btn-outline extras-option-btn">2 Runs (Bat)</button>
                                    <button onClick={() => handleNoBallExtraChoice(3, 'bat')} className="btn btn-outline extras-option-btn">3 Runs (Bat)</button>
                                    <button onClick={() => handleNoBallExtraChoice(4, 'bat')} className="btn btn-outline extras-option-btn">4 Runs (Bat)</button>
                                    <button onClick={() => handleNoBallExtraChoice(6, 'bat')} className="btn btn-outline extras-option-btn">6 Runs (Bat)</button>
                                    <button onClick={() => handleNoBallExtraChoice(1, 'bye')} className="btn btn-outline extras-option-btn">1 Run (Bye)</button>
                                    <button onClick={() => handleNoBallExtraChoice(2, 'bye')} className="btn btn-outline extras-option-btn">2 Runs (Bye)</button>
                                </div>
                            )}

                            <button onClick={() => setExtrasPrompt(null)} className="btn btn-secondary btn-block mt-4 btn-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* WICKET DETAILS FORMS MODAL */}
            {wicketPrompt && curInnings && (
                <div className="modal-overlay active">
                    <div className="modal-card glassmorphism">
                        <div className="modal-header">
                            <h3>Wicket Details</h3>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={e => { e.preventDefault(); handleWicketDetailsSubmit(); }}>
                                <div className="form-group">
                                    <label>Who is OUT?</label>
                                    <div className="grid-2 mt-1">
                                        <button 
                                            type="button" 
                                            onClick={() => setWicketWhoIsOut('striker')}
                                            className={`btn btn-outline ${wicketWhoIsOut === 'striker' ? 'active' : ''}`}
                                        >
                                            {curInnings.currentStriker} (Striker)
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setWicketWhoIsOut('nonStriker')}
                                            className={`btn btn-outline ${wicketWhoIsOut === 'nonStriker' ? 'active' : ''}`}
                                        >
                                            {curInnings.currentNonStriker} (Non-Striker)
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group mt-3">
                                    <label>Type of Dismissal</label>
                                    <div className="wicket-cards-grid">
                                        {[
                                            { type: 'Bowled', icon: '🎯' },
                                            { type: 'Caught', icon: '👐' },
                                            { type: 'L.B.W', icon: '🦵' },
                                            { type: 'Run Out', icon: '🏃' },
                                            { type: 'Stumped', icon: '🧤' },
                                            { type: 'Hit Wicket', icon: '💥' }
                                        ].map(w => (
                                            <button
                                                key={w.type}
                                                type="button"
                                                onClick={() => setWicketDismissalType(w.type)}
                                                className={`btn wicket-card-btn ${wicketDismissalType === w.type ? 'active' : ''}`}
                                            >
                                                <span className="wicket-type-icon">{w.icon}</span>
                                                <span>{w.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {(wicketDismissalType === 'Caught' || wicketDismissalType === 'Run Out' || wicketDismissalType === 'Stumped') && (
                                    <div className="form-group mt-3">
                                        <label htmlFor="wicket-fielder">
                                            {wicketDismissalType === 'Run Out' ? 'Fielder Throwing' : 'Fielder Involved'}
                                        </label>
                                        <select 
                                            id="wicket-fielder" 
                                            value={wicketFielder} 
                                            onChange={e => setWicketFielder(e.target.value)}
                                            required
                                        >
                                            <option value="">-- Select Fielder --</option>
                                            {(curInnings.fieldingTeam === 'A' ? matchState.teamAPlayers : matchState.teamBPlayers).map(f => (
                                                <option key={f} value={f}>{f}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid-2 mt-4">
                                    <button type="button" onClick={() => setWicketPrompt(false)} className="btn btn-outline">Cancel</button>
                                    <button type="submit" className="btn btn-danger">Confirm Wicket 🔴</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST ALERT MESSAGE POPUP */}
            {toastMessage && (
                <div className="toss-summary-box" style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2000,
                    boxShadow: 'var(--shadow-lg)',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--primary-color)',
                    color: 'var(--text-primary)',
                    animation: 'pulse 2s infinite ease-in-out'
                }}>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
