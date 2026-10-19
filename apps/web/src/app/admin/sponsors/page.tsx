'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { formatEUR } from '../../../lib/currency';
import { Plus } from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  funded_amount: number;
  created_at: string;
}

export default function AdminSponsorsPage() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [fundedAmount, setFundedAmount] = useState('0');

  const { data: sponsors, isLoading } = useQuery<Sponsor[]>({
    queryKey: ['admin-sponsors'],
    queryFn: () => apiClient<Sponsor[]>('/admin/sponsors'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiClient('/admin/sponsors', {
        method: 'POST',
        body: JSON.stringify({
          name,
          websiteUrl: websiteUrl || undefined,
          fundedAmount: parseInt(fundedAmount, 10) || 0,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sponsors'] });
      setIsCreating(false);
      setName('');
      setWebsiteUrl('');
      setFundedAmount('0');
    },
  });

  const totalFunded = sponsors?.reduce((sum, s) => sum + (s.funded_amount || 0), 0) ?? 0;

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-card border border-border rounded-3xl shadow-xl">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="copper">TREASURY & LIQUIDITY</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">
              {formatEUR(totalFunded)} COMMITTED
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
            Sponsor Funding & Liquidity
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage commercial brand partners funding tournament prize pools and sponsored esports circuits.
          </p>
        </div>

        <Button
          variant="default"
          size="default"
          onClick={() => setIsCreating(true)}
          className="font-bold text-xs gap-1.5 flex-shrink-0 shadow-md shadow-primary/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Brand Sponsor</span>
        </Button>
      </div>

      {/* Sponsor Creation Card */}
      {isCreating && (
        <Card className="bg-card border-primary/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">
              Register New Brand Sponsor
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sponsor grants are directly allocated to tournament prize escrow pools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Sponsor / Brand Name
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Red Bull Esports"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Website URL
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Committed Prize Liquidity (€ EUR)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={fundedAmount}
                    onChange={(e) => setFundedAmount(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  size="sm"
                  disabled={createMutation.isPending || !name}
                  className="text-xs font-bold"
                >
                  {createMutation.isPending ? 'Registering...' : 'Register Sponsor'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sponsors Table Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground">
            Active Brand Partners
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Organizations and advertisers powering prize guarantees on Playverzus.xyz.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading sponsors list...
            </div>
          ) : !sponsors || sponsors.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No brand sponsors added yet. Click "+ Add Brand Sponsor" above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Brand Partner</TableHead>
                  <TableHead className="font-bold">Website</TableHead>
                  <TableHead className="font-bold">Funded Liquidity</TableHead>
                  <TableHead className="font-bold text-right">Partner ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsors.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs">
                          💎
                        </span>
                        <span>{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.website_url ? (
                        <a
                          href={s.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-mono"
                        >
                          {s.website_url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="font-mono text-xs">
                        {formatEUR(s.funded_amount)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {s.id.substring(0, 8)}...
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
