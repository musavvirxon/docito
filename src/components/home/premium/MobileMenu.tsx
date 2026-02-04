// src/components/home/premium/MobileMenu.tsx
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";
import type { TFunction } from "i18next";

type NavKey =
  | "doctors"
  | "clinics"
  | "labs"
  | "pharmacies"
  | "imaging"
  | "hospitals"
  | "pricing";

interface MobileMenuProps {
  navLinks: { key: NavKey; href: string }[];
  labelFor: (key: NavKey) => string;
  isActive: (href: string) => boolean;
  user: User | null;
  onClose: () => void;
  getLocalizedPath: (path: string) => string;
  t: TFunction;
}

const MobileMenu = ({
  navLinks,
  labelFor,
  isActive,
  user,
  onClose,
  getLocalizedPath,
  t,
}: MobileMenuProps) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="lg:hidden bg-background/95 backdrop-blur-2xl border-t border-border/40 overflow-hidden"
      >
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="grid grid-cols-2 gap-2">
            {navLinks.map((link, index) => {
              const href = getLocalizedPath(link.href);
              return (
                <motion.div
                  key={link.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Link
                    to={href}
                    onClick={onClose}
                    className={`block py-3 px-4 text-sm font-medium rounded-xl transition-colors ${
                      isActive(href)
                        ? "text-primary bg-primary/10"
                        : "text-foreground/80 hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    {labelFor(link.key)}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 pt-6 border-t border-border/40 flex gap-3"
            >
              <Button
                onClick={() => {
                  navigate(getLocalizedPath("/auth"));
                  onClose();
                }}
                variant="outline"
                className="flex-1 h-12 text-sm font-medium rounded-xl"
              >
                {t("topNav.actions.signIn", { defaultValue: "Sign In" })}
              </Button>
              <Button
                onClick={() => {
                  navigate(getLocalizedPath("/auth?mode=register"));
                  onClose();
                }}
                className="flex-1 h-12 text-sm font-medium rounded-xl bg-primary text-primary-foreground"
              >
                {t("topNav.actions.register", { defaultValue: "Register" })}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MobileMenu;
