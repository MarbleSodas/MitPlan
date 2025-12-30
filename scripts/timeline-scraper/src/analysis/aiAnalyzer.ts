import { spawn } from 'child_process';
import type { 
  AbilityAnalysisRequest, 
  AbilityAnalysisResponse, 
  BossAction,
  MechanicType 
} from '../types/index.js';

interface AIAnalyzerConfig {
  enabled: boolean;
  provider: 'gemini-cli' | 'openai' | 'local';
  timeout: number;
  cacheResults: boolean;
}

const DEFAULT_CONFIG: AIAnalyzerConfig = {
  enabled: true,
  provider: 'gemini-cli',
  timeout: 30000,
  cacheResults: true,
};

const analysisCache = new Map<string, AbilityAnalysisResponse>();

export async function analyzeAbilityWithAI(
  request: AbilityAnalysisRequest,
  config: Partial<AIAnalyzerConfig> = {}
): Promise<AbilityAnalysisResponse | null> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  if (!cfg.enabled) {
    return null;
  }
  
  const cacheKey = createCacheKey(request);
  if (cfg.cacheResults && analysisCache.has(cacheKey)) {
    return analysisCache.get(cacheKey)!;
  }
  
  try {
    const result = await runGeminiAnalysis(request, cfg.timeout);
    
    if (result && cfg.cacheResults) {
      analysisCache.set(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    console.warn(`AI analysis failed for ${request.abilityName}: ${(error as Error).message}`);
    return null;
  }
}

async function runGeminiAnalysis(
  request: AbilityAnalysisRequest,
  timeout: number
): Promise<AbilityAnalysisResponse | null> {
  const prompt = buildAnalysisPrompt(request);
  
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, timeout);
    
    try {
      const gemini = spawn('gemini', ['-p', prompt], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      let stdout = '';
      let stderr = '';
      
      gemini.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      gemini.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      gemini.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code !== 0 || !stdout) {
          resolve(fallbackAnalysis(request));
          return;
        }
        
        const parsed = parseGeminiResponse(stdout, request);
        resolve(parsed);
      });
      
      gemini.on('error', () => {
        clearTimeout(timeoutId);
        resolve(fallbackAnalysis(request));
      });
      
    } catch {
      clearTimeout(timeoutId);
      resolve(fallbackAnalysis(request));
    }
  });
}

function buildAnalysisPrompt(request: AbilityAnalysisRequest): string {
  return `Analyze this FFXIV raid mechanic and respond with ONLY a JSON object:

Boss: ${request.bossName}
Ability: ${request.abilityName}
Damage: ${request.damage}
Hit Count: ${request.hitCount}
Target Count: ${request.targetCount}
Timing: ${request.timing}s into fight
${request.context ? `Context: ${request.context}` : ''}

Respond with JSON:
{
  "mechanicType": "raidwide|tankbuster|stack|spread|proximity|cleave|enrage|transition|mechanic|dot",
  "target": "party|tanks|healers|dps|random|proximity|marked",
  "description": "Brief description of mechanic",
  "importance": "low|medium|high|critical",
  "isTankBuster": boolean,
  "isDualTankBuster": boolean,
  "requiresMitigation": boolean,
  "confidence": 0.0-1.0
}`;
}

function parseGeminiResponse(
  response: string, 
  request: AbilityAnalysisRequest
): AbilityAnalysisResponse {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallbackAnalysis(request);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      mechanicType: validateMechanicType(parsed.mechanicType),
      target: validateTarget(parsed.target),
      description: parsed.description || `${request.abilityName} mechanic`,
      importance: validateImportance(parsed.importance),
      isTankBuster: Boolean(parsed.isTankBuster),
      isDualTankBuster: Boolean(parsed.isDualTankBuster),
      requiresMitigation: parsed.requiresMitigation !== false,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    };
  } catch {
    return fallbackAnalysis(request);
  }
}

function fallbackAnalysis(request: AbilityAnalysisRequest): AbilityAnalysisResponse {
  const name = request.abilityName.toLowerCase();
  
  const isTankBuster = /buster|smash|fracture|cleave|strike|blow/.test(name);
  const isRaidwide = /impact|burst|special|wave|raid/.test(name);
  const isStack = /stack|share/.test(name);
  const isSpread = /spread|scatter/.test(name);
  
  let mechanicType: MechanicType = 'unknown';
  let target: AbilityAnalysisResponse['target'] = 'party';
  
  if (isTankBuster) {
    mechanicType = 'tankbuster';
    target = 'tanks';
  } else if (isRaidwide) {
    mechanicType = 'raidwide';
  } else if (isStack) {
    mechanicType = 'stack';
    target = 'marked';
  } else if (isSpread) {
    mechanicType = 'spread';
    target = 'party';
  }
  
  const importance = isTankBuster || request.damage > 80000 ? 'high' : 
                     request.damage > 50000 ? 'medium' : 'low';
  
  return {
    mechanicType,
    target,
    description: `${request.abilityName}`,
    importance,
    isTankBuster,
    isDualTankBuster: /dual|both|tanks/.test(name),
    requiresMitigation: request.damage > 30000,
    confidence: 0.3,
  };
}

function validateMechanicType(type: string): MechanicType {
  const valid: MechanicType[] = [
    'raidwide', 'tankbuster', 'stack', 'spread', 'proximity',
    'cleave', 'enrage', 'transition', 'mechanic', 'dot', 'unknown'
  ];
  return valid.includes(type as MechanicType) ? (type as MechanicType) : 'unknown';
}

function validateTarget(target: string): AbilityAnalysisResponse['target'] {
  const valid = ['party', 'tanks', 'healers', 'dps', 'random', 'proximity', 'marked'];
  return valid.includes(target) ? (target as AbilityAnalysisResponse['target']) : 'party';
}

function validateImportance(imp: string): 'low' | 'medium' | 'high' | 'critical' {
  const valid = ['low', 'medium', 'high', 'critical'];
  return valid.includes(imp) ? (imp as 'low' | 'medium' | 'high' | 'critical') : 'medium';
}

function createCacheKey(request: AbilityAnalysisRequest): string {
  return `${request.bossName}_${request.abilityName}_${request.hitCount}`.toLowerCase();
}

export async function batchAnalyzeAbilities(
  actions: BossAction[],
  bossName: string,
  config: Partial<AIAnalyzerConfig> = {}
): Promise<Map<string, AbilityAnalysisResponse>> {
  const results = new Map<string, AbilityAnalysisResponse>();
  const uniqueAbilities = new Map<string, BossAction>();
  
  for (const action of actions) {
    const key = action.name.toLowerCase();
    if (!uniqueAbilities.has(key)) {
      uniqueAbilities.set(key, action);
    }
  }
  
  for (const [key, action] of uniqueAbilities) {
    const request: AbilityAnalysisRequest = {
      abilityName: action.name,
      bossName,
      damage: parseDamageFromString(action.unmitigatedDamage || '0'),
      hitCount: action.hitCount || 1,
      targetCount: 1,
      timing: action.time,
    };
    
    const result = await analyzeAbilityWithAI(request, config);
    if (result) {
      results.set(key, result);
    }
  }
  
  return results;
}

function parseDamageFromString(damage: string): number {
  const match = damage.match(/[\d,]+/);
  return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
}

export function clearAnalysisCache(): void {
  analysisCache.clear();
}
