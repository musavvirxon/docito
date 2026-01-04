// Layout components - single source of truth
export { DashboardShell } from '@/components/dashboard/DashboardShell';
export type { SidebarItem } from '@/components/dashboard/DashboardShell';

export { PublicShell } from './PublicShell';
export { UnifiedSidebar } from './UnifiedSidebar';
export type { SidebarNavItem } from './UnifiedSidebar';

export {
  CardSkeleton,
  TableRowSkeleton,
  ListItemSkeleton,
  PageSkeleton,
  SidebarSkeleton,
  FormSkeleton,
  SearchResultsSkeleton,
} from './Skeletons';

export { EmptyState } from '@/components/dashboard/EmptyState';
export { default as ProfileMenu } from '@/components/dashboard/ProfileMenu';
