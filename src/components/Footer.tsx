import { Link, useLocation } from 'react-router-dom';

export const ourProjects = [
  {
    label: 'Our Projects',
    href: '#',
    children: [
      {
        label: '2026 Budget Tracker',
        href: 'https://2026-budget.bettergov.ph',
        target: '_blank',
      },
      {
        label: 'Budget Tracker',
        href: 'https://budget.bettergov.ph',
        target: '_blank',
      },
      {
        label: 'Open Data Portal',
        href: 'https://data.bettergov.ph',
        target: '_blank',
      },     
      {
        label: 'SALN Tracker',
        href: 'https://saln.bettergov.ph',
        target: '_blank',
      },
      {
        label: 'OpenGov Blockchain',
        href: 'https://govchain.bettergov.ph',
        target: '_blank',
      },
      {
        label: 'Research & Visualizations',
        href: 'https://visualizations.bettergov.ph/',
        target: '_blank',
      },
    ],
  },
];

export const footerNavigation = {
  mainSections: [
    {
      title: 'About',
      links: [
        { label: 'About BetterGov.ph', href: 'https://about.bettergov.ph' },
        { label: 'Documentation', href: 'https://docs.bettergov.ph/' },
        { label: 'Accessibility', href: 'https://bettergov.ph/accessibility' },
        { label: 'Terms of Use', href: 'https://bettergov.ph/terms-of-service' },
        { label: 'Contact Us', href: 'https://bettergov.ph/contact' },
      ],
    },
    {
      title: 'Browse',
      links: [
        { label: 'Procurement', href: '/procurement' },
        { label: 'Budget', href: '/budget' },
        { label: 'DPWH Projects', href: '/dpwh' },
        { label: 'DPWH Contractors', href: '/dpwh/contractors' },
        { label: 'General Appropriations Act', href: '/gaa' },
        { label: 'BIR Collections', href: '/bir' },
        { label: 'Treasury', href: '/treasury' },        
      ],
    },
    {
      title: 'Other Transparency Projects',
      links: ourProjects[0].children,
    },
    {
      title: 'Official Government',
      links: [
        { label: 'Official Gov.ph', href: 'https://www.gov.ph' },
        { label: 'Open Data', href: 'https://data.gov.ph' },
        { label: 'Freedom of Information', href: 'https://www.foi.gov.ph' },
        {
          label: 'Contact Center',
          href: 'https://contactcenterngbayan.gov.ph',
        },
        {
          label: 'Official Gazette',
          href: 'https://www.officialgazette.gov.ph',
        },
      ],
    },
  ],
  socialLinks: [
    { label: 'Facebook', href: 'https://facebook.com/bettergovph' },
    { label: 'Discord', href: '/discord' },
    // { label: 'Instagram', href: 'https://instagram.com/govph' },
    // { label: 'YouTube', href: 'https://youtube.com/govph' },
  ],
};

const Footer = () => {

  const { pathname } = useLocation();

  if (pathname === '/philippines/map') return null;

  return (
    <footer className='bg-gray-900 text-white'>
      <div className='container mx-auto px-4 pt-12 pb-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8'>
          <div className='col-span-1 md:col-span-2'>
            <div className='flex items-center mb-4'>
              <img
                src='https://assets.bettergov.ph/logos/webp/icon-white.webp'
                alt='BetterGov Logo'
                className='h-12 w-12 mr-3'
              />

              <div>
                <div className='font-bold'>Better Philippines</div>
                <div className='text-xs text-gray-400'>BetterGov.ph Transparency Portal</div>
              </div>
            </div>
            <p className='text-gray-400 text-sm mb-4'>
              A community portal providing Philippine citizens, businesses, and
              visitors with information and services.
            </p>
            <div className='flex space-x-4'>
              {footerNavigation.socialLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  className='text-gray-400 hover:text-white transition-colors'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {footerNavigation.mainSections.map(section => (
            <div key={section.title} className='hidden lg:block'>
              <h3 className='text-lg font-semibold mb-4'>{section.title}</h3>
              <ul className='space-y-2'>
                {section.links.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className='text-gray-400 hover:text-white text-sm transition-colors'
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className='flex justify-center my-24'>
          <p className='text-white text-sm md:text-lg bg-gray-800 p-4 px-12 md:px-8 rounded-full border border-gray-700'>
            Cost to build this site to date:{' '}
            <span className='animate-pulse text-red-500'>₱0</span>. Cost to
            the People of the Philippines:{' '}
            <span className='text-green-500'>₱0</span>.
          </p>
        </div>

        <div className='border-t border-gray-800 mt-8 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <p className='text-gray-400 text-sm mb-4 md:mb-0'>
            All content is public domain unless otherwise specified.
            </p>
            <div className='flex space-x-6'>
              <Link
                to='https://github.com/bettergovph/bettergov'
                className='text-gray-400 hover:text-white text-sm transition-colors'
              >
                Contribute at GitHub
              </Link>
              <Link
                to='/sitemap'
                className='text-gray-400 hover:text-white text-sm transition-colors'
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;