import { useState, useEffect } from 'react';
import { Relationship, Milestone, UserProfile } from '../types';

export function useStore() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const rels = localStorage.getItem('timeleft_relationships');
    const ms = localStorage.getItem('timeleft_milestones');
    const profile = localStorage.getItem('timeleft_profile');

    if (rels) setRelationships(JSON.parse(rels));
    if (ms) setMilestones(JSON.parse(ms));
    if (profile) setUserProfile(JSON.parse(profile));
    setIsLoaded(true);
  }, []);

  const saveRelationships = (data: Relationship[]) => {
    setRelationships(data);
    localStorage.setItem('timeleft_relationships', JSON.stringify(data));
  };

  const saveMilestones = (data: Milestone[]) => {
    setMilestones(data);
    localStorage.setItem('timeleft_milestones', JSON.stringify(data));
  };

  const saveUserProfile = (data: UserProfile) => {
    setUserProfile(data);
    localStorage.setItem('timeleft_profile', JSON.stringify(data));
  };

  return {
    relationships,
    saveRelationships,
    milestones,
    saveMilestones,
    userProfile,
    saveUserProfile,
    isLoaded
  };
}
