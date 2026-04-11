import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, Phone, User, Briefcase, MessageSquare } from 'lucide-react';
import { usePracticeInvitations } from '@/hooks/usePracticeInvitations';
import { useTranslation } from 'react-i18next';

interface InviteStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  practiceId: string;
}

const STAFF_ROLES = [
  'Doctor',
  'Assistant',
  'Receptionist',
  'Manager',
  'Technician',
  'Hygienist',
  'Other',
];

export const InviteStaffModal = ({ open, onOpenChange, practiceId }: InviteStaffModalProps) => {
  const { t } = useTranslation('dashboard');
  const { sendInvitation } = usePracticeInvitations(practiceId);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: '',
    custom_message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.role) {
      return;
    }

    setSending(true);
    try {
      const result = await sendInvitation({
        email: formData.email,
        phone: formData.phone || undefined,
        full_name: formData.full_name || undefined,
        role: formData.role,
        custom_message: formData.custom_message || undefined,
      });

      if (result.success) {
        setFormData({
          full_name: '',
          email: '',
          phone: '',
          role: '',
          custom_message: '',
        });
        onOpenChange(false);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("inviteStaff.title")}</DialogTitle>
          <DialogDescription>
            {t("inviteStaff.description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">
              <User className="w-4 h-4 inline mr-2" />
              {t("inviteStaff.fullName")}
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder={t("inviteStaff.fullNamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("inviteStaff.existingAccountNote")}
            </p>
          </div>

          <div>
            <Label htmlFor="email">
              <Mail className="w-4 h-4 inline mr-2" />
              {t("inviteStaff.emailAddress")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t("inviteStaff.emailPlaceholder")}
            />
          </div>

          <div>
            <Label htmlFor="phone">
              <Phone className="w-4 h-4 inline mr-2" />
              {t("inviteStaff.phoneNumber")}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t("inviteStaff.phonePlaceholder")}
            />
          </div>

          <div>
            <Label htmlFor="role">
              <Briefcase className="w-4 h-4 inline mr-2" />
              {t("inviteStaff.rolePosition")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={t("inviteStaff.selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="custom_message">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              {t("inviteStaff.welcomeMessage")}
            </Label>
            <Textarea
              id="custom_message"
              value={formData.custom_message}
              onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
              placeholder={t("inviteStaff.welcomePlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("inviteStaff.cancel")}
            </Button>
            <Button type="submit" disabled={sending || !formData.email || !formData.role}>
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("inviteStaff.sending")}
                </>
              ) : (
                t("inviteStaff.sendInvitation")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
