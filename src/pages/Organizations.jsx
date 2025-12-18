import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { db } from '../components/services/database';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Organizations() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const orgs = await db.organizations.getAll();
      return orgs.filter(o => 
        o.owner_email === user.email || 
        (o.member_emails && o.member_emails.includes(user.email))
      );
    },
    enabled: !!user
  });

  const createOrgMutation = useMutation({
    mutationFn: async (name) => {
      const code = generateJoinCode();
      return await db.organizations.create({
        name,
        owner_email: user.email,
        join_code: code,
        member_emails: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setCreateDialogOpen(false);
      setNewOrgName('');
      toast.success('Organization created');
    }
  });

  const joinOrgMutation = useMutation({
    mutationFn: async (code) => {
      const orgs = await db.organizations.getAll();
      const org = orgs.find(o => o.join_code === code.toUpperCase());
      if (!org) throw new Error('Invalid join code');
      if (org.owner_email === user.email || (org.member_emails && org.member_emails.includes(user.email))) {
        throw new Error('Already a member');
      }
      
      const updatedMembers = [...(org.member_emails || []), user.email];
      await db.organizations.update(org.id, { member_emails: updatedMembers });
      return org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['organizations']);
      setJoinDialogOpen(false);
      setJoinCode('');
      toast.success('Joined organization');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Code copied');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Organizations
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Share templates and connections with your team
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Join Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Join Code</Label>
                    <Input
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Enter 6-character code"
                      maxLength={6}
                    />
                  </div>
                  <Button 
                    onClick={() => joinOrgMutation.mutate(joinCode)}
                    disabled={joinCode.length !== 6}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    Join
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Organization</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Organization Name</Label>
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="My Company"
                    />
                  </div>
                  <Button 
                    onClick={() => createOrgMutation.mutate(newOrgName)}
                    disabled={!newOrgName.trim()}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    Create
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No organizations yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create or join an organization to collaborate
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map((org) => {
              const isOwner = org.owner_email === user.email;
              return (
                <Card key={org.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{org.name}</span>
                      {isOwner && (
                        <span className="text-xs font-normal bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 px-2 py-1 rounded">
                          Owner
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      <p><strong>{(org.member_emails?.length || 0) + 1}</strong> members</p>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        <Input
                          value={org.join_code}
                          readOnly
                          className="text-sm font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(org.join_code)}
                        >
                          {copiedCode === org.join_code ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}