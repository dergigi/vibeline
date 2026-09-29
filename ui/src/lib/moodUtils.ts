export type MoodColor = 'red' | 'yellow' | 'blue' | 'green';

type EmotionCategory = {
  label: string;
  emotions: Record<string, string>;
};

type EmotionsType = Record<MoodColor, EmotionCategory>;

export const EMOTIONS: EmotionsType = {
  yellow: {
    label: "High Energy Pleasant",
    emotions: {
      "Alert": "feeling awake and focused",
      "Alive": "filled with energy and vitality",
      "Absorbed": "fully focused and interested",
      "Accomplished": "feeling effective and successful",
      "Adoring": "feeling a deep love or respect for something or someone",
      "Attentive": "focused on what you're doing",
      "Buoyant": "feeling cheerful and lively",
      "Challenged": "feeling pushed to reach a higher goal",
      "Chatty": "feeling like talking in a friendly, informal way",
      "Cheerful": "full of happy feelings",
      "Competent": "feeling capable of doing something successfully",
      "Confident": "feeling sure of yourself",
      "Curious": "interested in learning something",
      "Determined": "knowing what you want and not letting anything stand in the way",
      "Delighted": "feeling lifted by joy",
      "Desire": "wishing or longing for something or someone",
      "Eager": "impatiently wanting to do or get something",
      "Ecstatic": "feeling the greatest amount of joy or happiness",
      "Elated": "very joyful, proud, or enthusiastic",
      "Empowered": "feeling stronger or more confident due to someone or something that happened",
      "Enchanted": "filled with delight",
      "Encouraged": "feeling supported and hopeful with a sense of increasing confidence",
      "Energized": "feeling like you are wide awake and ready to get up and go",
      "Engaged": "paying full attention or participating fully in something",
      "Engrossed": "fully focused on someone or something"
    }
  },
  green: {
    label: "Low Energy Pleasant",
    emotions: {
      "Accepted": "feeling acknowledged and seen",
      "Affectionate": "feeling or showing fondness",
      "Appreciated": "feeling recognized and worthy",
      "At Ease": "feeling content and comfortable",
      "Balanced": "feeling stable and satisfied",
      "Blessed": "feeling thankful and fortunate for what you have",
      "Blissful": "feeling full of joy",
      "Calm": "feeling free of stress, agitation, and worry",
      "Carefree": "feeling free of worry and lighthearted",
      "Chill": "feeling relaxed and easygoing",
      "Clear": "the feeling that you can perceive, understand, or interpret events or situations you are facing",
      "Comfortable": "feeling reassured both in mind and body",
      "Compassionate": "showing care and concern for someone",
      "Connected": "feeling close to someone or part of a community",
      "Contemplative": "a reflective and thoughtful state, usually for a prolonged time",
      "Content": "feeling complete and like you are enough",
      "Copacetic": "feeling agreeable and free of problems",
      "Fulfilled": "feeling like you have accomplished important personal goals or have become the person you want to be"
    }
  },
  blue: {
    label: "Low Energy Unpleasant",
    emotions: {
      "Abandoned": "feeling left behind and not considered, wanted, or cared about",
      "Alienated": "feeling like you have been made a stranger to others, like they have no feelings or affection towards you",
      "Apathetic": "lacking enthusiasm or interest",
      "Ashamed": "feeling lower self-worth as a result of who you are or what you did",
      "Avoidant": "unwilling to face or engage with someone or something",
      "Bereft": "suffering a loss of someone or something",
      "Betrayed": "feeling hurt when someone breaks your trust",
      "Bleh": "feeling indifference or mild discomfort",
      "Blue": "feeling sad, gloom, or dispirited",
      "Bored": "lacking interest in something or someone",
      "Brooding": "preoccupied with depressing or painful thoughts",
      "Burdened": "feeling encumbered by and responsible for something or someone",
      "Burned Out": "feeling exhausted from ongoing stress",
      "Cancelled": "feeling cast out because of a perceived offense",
      "Crushed": "overwhelmingly disappointed or let down",
      "Dead Inside": "depressed to the point of feeling you've lost your spirit or soul",
      "Defeated": "feeling demoralized or overcome by adversity",
      "Deficient": "feeling inadequate or like you lack a desired quality",
      "Dejected": "feeling unhappy, low in spirits",
      "Desolate": "feeling bleak and miserable",
      "Despair": "a feeling of complete hopelessness",
      "Disappointed": "sad because your expectations were not met",
      "Disconnected": "feeling separate from others",
      "Discontented": "dissatisfied with your circumstances",
      "Discouraged": "feeling a loss of confidence and enthusiasm",
      "Disenchanted": "feeling let down by someone or something you once admired",
      "Disengaged": "feeling like you cannot focus; disinterested",
      "Disgruntled": "feeling annoyed and disappointed",
      "Disgusted": "feeling a strong dislike of someone or something",
      "Disheartened": "loss of resolve or determination",
      "Disillusioned": "disappointed in someone who has not lived up to your belief in them",
      "Dispirited": "having lost enthusiasm and hope",
      "Disrespected": "not being treated as if your ideas and feelings matter",
      "Dissatisfied": "unhappy with someone or something",
      "Empty": "lacking meaning or connection",
      "Forlorn": "feeling both sad and alone",
      "Fragile": "feeling delicate and like you could easily break"
    }
  },
  red: {
    label: "High Energy Unpleasant",
    emotions: {
      "Afraid": "experiencing fear or threat",
      "Agitated": "very troubled and restless",
      "Alarmed": "a sense of urgent fear or concern",
      "Ambivalent": "having contradictory attitudes or feelings about something",
      "Angry": "strongly bothered about a perceived injustice",
      "Anguished": "experiencing severe physiological pain or suffering",
      "Annoyed": "bothered by something displeasing or uncomfortable",
      "Anxious": "worried and uneasy about an uncertain outcome",
      "Apprehensive": "unease and worry about something that might happen",
      "Astonished": "greatly surprised or impressed",
      "Confused": "feeling unable to make sense of something",
      "Contempt": "feeling a combination of anger and disgust",
      "Conflicted": "having mutually inconsistent feelings about something",
      "Concerned": "wondering if someone or something is okay",
      "Discombobulated": "thrown into a state of confusion or uncertainty",
      "Discomfort": "feeling of unease or pain",
      "Distracted": "feeling diverted or far away from the present focus",
      "Distressed": "feeling unwell and agitated physiologically, can have different causes (emotional pain, threat, loss, etc.)",
      "Dread": "anxiety because of expecting something unpleasant or upsetting",
      "Dumbfounded": "being speechless with shock",
      "Dysregulated": "feeling you can't steady your emotions",
      "Embarrassed": "self-conscious and uncomfortable about how you think others are perceiving you",
      "Frazzled": "feeling exhausted, disorganized, and emotionally frayed",
      "Frightened": "afraid or fearful",
      "Frozen": "feeling you cannot act due to overwhelming anxiety or fear",
      "Frustrated": "upset because you cannot do something you want to do",
      "Furious": "full of extreme or wild anger"
    }
  }
};

export interface EmotionWithColor {
  emotion: string;
  color: MoodColor;
}

export interface MoodAnalysis {
  dominant: MoodColor | null;
  topEmotions: EmotionWithColor[];
}

/**
 * Returns the mood color for a given emotion, or null if not found.
 */
export function getEmotionColor(emotion: string): MoodColor | null {
  for (const [color, category] of Object.entries(EMOTIONS)) {
    if (Object.keys(category.emotions).some(e => e.toLowerCase() === emotion.toLowerCase())) {
      return color as MoodColor;
    }
  }
  return null;
}

/**
 * Analyzes text for emotional content and returns the dominant mood quadrant and top emotions.
 */
export function analyzeEmotions(text: string): MoodAnalysis {
  if (!text || !text.trim()) {
    return { dominant: null, topEmotions: [] };
  }

  const lowerText = text.toLowerCase();
  const emotionCounts: Record<string, number> = {};
  const quadrantCounts: Record<MoodColor, number> = {
    yellow: 0,
    green: 0,
    blue: 0,
    red: 0
  };

  // Count emotion matches
  Object.entries(EMOTIONS).forEach(([color, category]) => {
    Object.keys(category.emotions).forEach(emotion => {
      const regex = new RegExp(`\\b${emotion.toLowerCase()}\\b`, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      if (matches > 0) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + matches;
        quadrantCounts[color as MoodColor] += matches;
      }
    });
  });

  // Find dominant quadrant
  const totalMatches = Object.values(quadrantCounts).reduce((a, b) => a + b, 0);
  if (totalMatches === 0) {
    return { dominant: null, topEmotions: [] };
  }

  const dominant = (Object.entries(quadrantCounts) as [MoodColor, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  // Get top 5 emotions with their colors (sorted by frequency)
  const topEmotions: EmotionWithColor[] = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion]) => ({
      emotion,
      color: getEmotionColor(emotion)!
    }));

  return { dominant, topEmotions };
}

