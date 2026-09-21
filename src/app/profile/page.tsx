'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { UserCheck, Save, Plus, X } from 'lucide-react';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Fields
  const [fullName, setFullName] = useState('');
  const [education, setEducation] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState<string>('');
  const [currentRole, setCurrentRole] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('0');
  
  // Array fields
  const [preferredJobRoles, setPreferredJobRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [technicalSkills, setTechnicalSkills] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);

  // Input states for tag additions
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTechSkill, setNewTechSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (data) {
            setFullName(data.full_name || '');
            setEducation(data.education || '');
            setCollege(data.college || '');
            setDegree(data.degree || '');
            setGraduationYear(data.graduation_year ? String(data.graduation_year) : '');
            setCurrentRole(data.current_role || '');
            setCareerGoal(data.career_goal || '');
            setYearsOfExperience(data.years_of_experience ? String(data.years_of_experience) : '0');
            setPreferredJobRoles(data.preferred_job_roles || []);
            setPreferredLocations(data.preferred_locations || []);
            setTechnicalSkills(data.technical_skills || []);
            setSoftSkills(data.soft_skills || []);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setMessage({ type: 'error', text: 'You must be signed in to save your profile.' });
        setSaving(false);
        return;
      }

      const updatePayload: Partial<Profile> = {
        id: user.id,
        full_name: fullName.trim() || null,
        education: education.trim() || null,
        college: college.trim() || null,
        degree: degree.trim() || null,
        graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
        current_role: currentRole.trim() || null,
        career_goal: careerGoal.trim() || null,
        years_of_experience: parseFloat(yearsOfExperience) || 0,
        preferred_job_roles: preferredJobRoles,
        preferred_locations: preferredLocations,
        technical_skills: technicalSkills,
        soft_skills: softSkills,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updatePayload);

      if (error) {
        throw error;
      }

      // Sync skills table
      for (const skill of technicalSkills) {
        await supabase
          .from('skills')
          .upsert(
            { user_id: user.id, name: skill.trim(), category: 'technical', source: 'profile' },
            { onConflict: 'user_id,name' }
          );
      }

      for (const skill of softSkills) {
        await supabase
          .from('skills')
          .upsert(
            { user_id: user.id, name: skill.trim(), category: 'soft', source: 'profile' },
            { onConflict: 'user_id,name' }
          );
      }

      setMessage({ type: 'success', text: 'Your profile has been saved successfully!' });
    } catch (err: unknown) {
      console.error('Profile update error:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred while saving your profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = (
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    clearInput: () => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      clearInput();
    }
  };

  const removeTag = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList(list.filter((x) => x !== item));
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2ded7]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#262a2a] font-serif flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-[#ca9881]" />
              Career Profile
            </h1>
            <p className="text-sm text-[#5c6463] mt-1">
              Keep your credentials and background up-to-date. This information directly grounds your career coach and job matching.
            </p>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'success' ? 'success' : 'destructive'}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* General Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal & Professional Background</CardTitle>
              <CardDescription>Your current employment and career targets</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Current Role / Title
                </label>
                <Input
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="e.g. CS Student / Junior Software Engineer"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Target Career Goal
                </label>
                <Input
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  placeholder="e.g. Full Stack Engineer at High-Growth Startup"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Years of Professional Experience
                </label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={yearsOfExperience}
                  onChange={(e) => setYearsOfExperience(e.target.value)}
                  placeholder="0"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Education Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Academic Background</CardTitle>
              <CardDescription>Your degrees, university, and completion timeline</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Highest Education Level
                </label>
                <Input
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. Bachelor of Science / Master's"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  College / University
                </label>
                <Input
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Stanford University"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Major / Degree Field
                </label>
                <Input
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. Computer Science"
                  disabled={loading}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Graduation Year
                </label>
                <Input
                  type="number"
                  min="1970"
                  max="2035"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="e.g. 2026"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Technical Skills</CardTitle>
              <CardDescription>
                Technologies, programming languages, databases, and frameworks you actually know
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newTechSkill}
                  onChange={(e) => setNewTechSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newTechSkill, technicalSkills, setTechnicalSkills, () => setNewTechSkill(''));
                    }
                  }}
                  placeholder="Add a technical skill (e.g. React, PostgreSQL, Docker, Go)"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addTag(newTechSkill, technicalSkills, setTechnicalSkills, () => setNewTechSkill(''))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {technicalSkills.length > 0 ? (
                  technicalSkills.map((skill) => (
                    <Badge key={skill} variant="default" className="flex items-center gap-1.5 py-1 px-3">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(skill, technicalSkills, setTechnicalSkills)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No technical skills added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Soft Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Soft Skills & Competencies</CardTitle>
              <CardDescription>Interpersonal strengths, leadership, and communication attributes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newSoftSkill}
                  onChange={(e) => setNewSoftSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(newSoftSkill, softSkills, setSoftSkills, () => setNewSoftSkill(''));
                    }
                  }}
                  placeholder="Add a soft skill (e.g. Team Leadership, Agile Collaboration, Public Speaking)"
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => addTag(newSoftSkill, softSkills, setSoftSkills, () => setNewSoftSkill(''))}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {softSkills.length > 0 ? (
                  softSkills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="flex items-center gap-1.5 py-1 px-3">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(skill, softSkills, setSoftSkills)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No soft skills added yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job & Location Preferences</CardTitle>
              <CardDescription>Target job titles and preferred work locations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Preferred Roles */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Target Job Titles
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    placeholder="e.g. Backend Engineer"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(newRole, preferredJobRoles, setPreferredJobRoles, () => setNewRole(''));
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addTag(newRole, preferredJobRoles, setPreferredJobRoles, () => setNewRole(''))}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {preferredJobRoles.map((role) => (
                    <Badge key={role} variant="outline" className="flex items-center gap-1 py-0.5">
                      <span>{role}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(role, preferredJobRoles, setPreferredJobRoles)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Preferred Locations */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#262a2a]">
                  Target Locations
                </label>
                <div className="flex gap-2">
                  <Input
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA / Remote"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(newLocation, preferredLocations, setPreferredLocations, () => setNewLocation(''));
                      }
                    }}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => addTag(newLocation, preferredLocations, setPreferredLocations, () => setNewLocation(''))}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {preferredLocations.map((loc) => (
                    <Badge key={loc} variant="outline" className="flex items-center gap-1 py-0.5">
                      <span>{loc}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(loc, preferredLocations, setPreferredLocations)}
                        className="hover:text-red-500 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" isLoading={saving} className="px-8">
              <Save className="h-4 w-4 mr-2" />
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
