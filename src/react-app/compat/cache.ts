import { refreshNavigation } from '../navigation-store';

export function revalidatePath(_path?: string, _type?: 'page' | 'layout') {
  refreshNavigation();
}
