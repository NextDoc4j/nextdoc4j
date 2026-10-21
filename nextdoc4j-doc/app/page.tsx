import { HomePage } from '@/components/home-page';
import { baseOptions } from '@/lib/layout.shared';
import { HomeLayout } from 'fumadocs-ui/layouts/home';

const homeBaseOptions = baseOptions({ includePlatforms: true });

const homeLinks = homeBaseOptions.links ?? [];

export default function Page() {
  return (
    <HomeLayout {...homeBaseOptions} links={homeLinks}>
      <HomePage />
    </HomeLayout>
  );
}
