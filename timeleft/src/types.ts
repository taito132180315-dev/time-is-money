export type Plan = {
  id: string;
  title: string;
  date: string;
};

export type AvatarCustomization = {
  skinColor: string;
  hairStyle: string;
  hairColor: string;
  outfitColor: string;
  eyeColor: string;
};

export type Relationship = {
  id: string;
  name: string;
  photo?: string;
  gender?: 'male' | 'female';
  avatar?: AvatarCustomization;
  meetDate: string;
  context: 'school' | 'work' | 'other';
  endDate: string;
  aiComment?: string;
  plans?: Plan[];
};

export type MilestoneType = 'age' | 'date' | 'event';

export type Milestone = {
  id: string;
  name: string;
  type: MilestoneType;
  targetDate?: string;
  targetAge?: number;
  createdAt: string;
  aiComment?: string;
};

export type UserProfile = {
  birthDate: string;
};
