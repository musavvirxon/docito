import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Download, Check } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface LegalPageData {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function LegalDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<LegalPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchLegalPage();
      if (user) {
        checkAcceptance();
      }
    }
  }, [slug, user]);

  const fetchLegalPage = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('id, slug, title, content, updated_at')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) throw error;
      setPage(data);
    } catch (error) {
      console.error('Error fetching legal page:', error);
      toast.error('Failed to load legal page');
      navigate('/legal');
    } finally {
      setLoading(false);
    }
  };

  const checkAcceptance = async () => {
    if (!user || !slug) return;

    try {
      const { data } = await supabase
        .from('user_policy_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('policy_slug', slug)
        .single();

      setHasAccepted(!!data);
    } catch (error) {
      // No acceptance found
      setHasAccepted(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !page) return;

    setIsAccepting(true);
    try {
      const { error } = await supabase
        .from('user_policy_acceptances')
        .insert({
          user_id: user.id,
          policy_slug: page.slug,
          policy_version: format(new Date(page.updated_at), 'yyyy-MM-dd'),
          ip_address: null, // Would need server-side implementation
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      setHasAccepted(true);
      toast.success('Policy accepted successfully');
    } catch (error) {
      console.error('Error accepting policy:', error);
      toast.error('Failed to record acceptance');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDownloadPDF = () => {
    // In production, implement PDF generation
    toast.info('PDF download feature coming soon');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link to="/legal">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Legal Center
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">{page.title}</h1>
              <p className="text-muted-foreground">
                Effective Date: {format(new Date(page.updated_at), 'MMMM d, yyyy')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none p-8">
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </CardContent>
        </Card>

        {user && (slug === 'privacy-policy' || slug === 'terms-of-service') && (
          <Card className="mt-6 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {hasAccepted ? (
                  <>
                    <div className="p-2 rounded-full bg-green-500/10">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">You've accepted this policy</h3>
                      <p className="text-sm text-muted-foreground">
                        Your acceptance was recorded and is stored securely.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Checkbox 
                      id="accept-policy"
                      disabled={isAccepting}
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor="accept-policy" 
                        className="text-sm font-medium cursor-pointer"
                      >
                        I have read and agree to the {page.title}
                      </label>
                      <Button 
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className="mt-4"
                        size="sm"
                      >
                        Accept Policy
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about this policy? Contact us at{' '}
            <a href="mailto:legal@docito.com" className="text-primary hover:underline">
              legal@docito.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
