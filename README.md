# PhilGEPS Contract Browser

A modern, responsive search interface for Philippine government procurement records built with Vite, React 19, TypeScript, Tailwind CSS v4, and MeiliSearch.

## ✨ Features

- **🔍 Smart Search**: Real-time full-text search across multiple fields with advanced query syntax
- **📊 Interactive Dashboard**: Statistics, analytics, and visualizations for search results
- **🗂️ Entity Directories**: Browse contractors, organizations, locations, and categories
- **📈 Data Insights**: Charts and trends for procurement spending over time
- **🎨 Modern UI/UX**: Clean, professional design with responsive tables and mobile support
- **📱 Mobile Responsive**: Optimized for all screen sizes with touch-friendly interfaces
- **⚡ Fast Performance**: Powered by MeiliSearch for instant search results
- **🔧 Advanced Filtering**: Multi-select filters for areas, awardees, and organizations
- **📥 CSV Export**: Download search results for offline analysis

## 🛠️ Tech Stack

- **Frontend**: Vite, React 19, TypeScript, React Router
- **Styling**: Tailwind CSS v4, Figtree font, custom animations
- **Search Engine**: MeiliSearch with instant search and filtering
- **UI Components**: shadcn/ui (Radix UI primitives), Lucide React icons
- **Charts**: Recharts for data visualization
- **SEO**: React Helmet for meta tags
- **State Management**: React hooks with debounced search
- **Data Processing**: Python scripts with pandas and pyarrow

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd philgeps
npm install
```

### 2. Environment Setup

Copy the environment example file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MeiliSearch Configuration
VITE_MEILISEARCH_HOST=http://localhost:7700
VITE_MEILISEARCH_API_KEY=your_master_key_here
VITE_MEILISEARCH_INDEX_NAME=philgeps

# Application Configuration
VITE_APP_NAME=PHILGEPS Search
VITE_APP_DESCRIPTION=Government Procurement Search Platform
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see your application running!

## 📋 Search Fields

The application allows searching across these comprehensive fields:

- `reference_id` - Reference ID
- `contract_no` - Contract Number  
- `award_title` - Award Title
- `notice_title` - Notice Title
- `awardee_name` - Awardee Name
- `organization_name` - Organization Name
- `area_of_delivery` - Area of Delivery
- `business_category` - Business Category
- `contract_amount` - Contract Amount
- `award_date` - Award Date
- `award_status` - Award Status

## 🎯 Usage

### Basic Search
1. Type your search query in the main search bar
2. Results appear instantly as you type with debounced search
3. View contract details, amounts, and status information

### Advanced Filtering
1. Click the "Filters" button to open the filter panel
2. Filter by business category (Construction, IT, Medical Equipment, etc.)
3. Sort results by relevance, award date, or contract amount
4. View real-time statistics and analytics

### Features
- **Smart Search**: Finds matches across all fields simultaneously
- **Category Icons**: Visual indicators for different business categories
- **Currency Formatting**: Philippine Peso (PHP) formatting for contract amounts
- **Date Formatting**: Localized date display
- **Status Indicators**: Color-coded award status badges
- **Responsive Cards**: Hover effects and smooth transitions

## 🔧 MeiliSearch Setup & Data Loading

For detailed instructions on downloading data, setting up MeiliSearch, and importing PhilGEPS data, see:

**[data/README.md](data/README.md)**

The data loading process includes:
1. Downloading parquet files from Hugging Face
2. Extracting data using DuckDB
3. Importing main contract data into MeiliSearch
4. Importing pre-aggregated filter data for efficient browsing

## 🎨 Customization

### Styling
- Edit `src/index.css` for global styles and animations
- Modify `tailwind.config.js` for Tailwind CSS configuration
- Update component styles in individual `.tsx` files

### Components
- **Navigation**: Main navigation with dropdown menus
- **EnhancedSearchInterface**: Advanced search with filters, sorting, and pagination
- **Directory Pages**: Contractors, Organizations, Locations, Categories list views
- **Detail Pages**: Individual entity pages with statistics and charts
- **Footer**: Site-wide footer component
- **SearchGuide**: Interactive search syntax guide
- **UI Components**: Reusable shadcn/ui components in `src/components/ui/`
- **ErrorBoundary**: Error handling component
- **Types**: TypeScript definitions in `src/types/`

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_MEILISEARCH_HOST` | MeiliSearch server URL | `http://localhost:7700` |
| `VITE_MEILISEARCH_API_KEY` | MeiliSearch API key | `masterKey` |
| `VITE_MEILISEARCH_INDEX_NAME` | Search index name | `philgeps` |
| `VITE_APP_NAME` | Application name | `PHILGEPS Search` |
| `VITE_APP_DESCRIPTION` | App description | `Government Procurement Search Platform` |

## 🧪 Development

### Available Scripts

#### Development & Build
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

#### GAA Budget Data Pipeline
```bash
# Full pipeline: CSV → Parquet → Aggregates → MeiliSearch
npm run gaa:pipeline

# Individual steps:
npm run gaa:csv-to-parquet      # Convert CSV files to Parquet
npm run gaa:create-aggregates   # Generate JSON aggregates
npm run gaa:import              # Import to MeiliSearch
npm run gaa:configure-search    # Configure MeiliSearch index

# Quick reload (skip CSV/aggregates):
npm run gaa:reload              # Re-import and configure search only
```

#### Sitemap Generation
```bash
npm run generate:sitemap             # Generate budget sitemap
npm run generate:sitemap:procurement # Generate procurement sitemap
npm run generate:sitemap:index       # Generate sitemap index
npm run generate:sitemaps:all        # Generate all sitemaps
```

#### Search & Data
```bash
npm run seed            # Seed MeiliSearch with sample data
npm run search:stats    # Display search statistics
```

### Project Structure

```
philgeps/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── autocomplete.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── input.tsx
│   │   ├── AwardeePage.tsx          # Individual contractor detail page
│   │   ├── CategoriesListPage.tsx   # Categories directory
│   │   ├── CategoryPage.tsx         # Category detail page
│   │   ├── ContractorsPage.tsx      # Contractors directory
│   │   ├── EnhancedSearchInterface.tsx  # Main search interface
│   │   ├── ErrorBoundary.tsx        # Error handling
│   │   ├── Footer.tsx               # Site footer
│   │   ├── LocationPage.tsx         # Location detail page
│   │   ├── LocationsListPage.tsx    # Locations directory
│   │   ├── Navigation.tsx           # Main navigation
│   │   ├── OrganizationPage.tsx     # Organization detail page
│   │   ├── OrganizationsListPage.tsx # Organizations directory
│   │   └── SearchGuide.tsx          # Search syntax guide
│   ├── lib/
│   │   ├── meilisearch.ts           # MeiliSearch client config
│   │   └── utils.ts                 # Utility functions
│   ├── types/
│   │   └── search.ts                # TypeScript interfaces
│   ├── App.tsx                      # Root component with routing
│   ├── main.tsx                     # React 19 render root
│   ├── index.css                    # Global styles
│   └── App.css                      # Component styles
├── data/
│   ├── philgeps/
│   │   ├── import.py                # Main data import script
│   │   ├── import_extras.py         # Aggregated data import
│   │   ├── philgeps-extract.sql     # DuckDB extraction script
│   │   └── update_index.py          # Index update script
│   ├── gaa/
│   │   └── import_gaa.py            # GAA data import
│   ├── requirements.txt             # Python dependencies
│   └── README.md                    # Data setup instructions
├── .env.example                     # Environment variables example
├── tailwind.config.js               # Tailwind CSS v4 config
├── vite.config.ts                   # Vite configuration
├── LICENSE                          # MIT License
└── README.md
```

## 🐛 Error Handling

The application includes comprehensive error handling:

- **Error Boundary**: Catches and displays React component errors
- **Search Error Handling**: Graceful handling of MeiliSearch connection issues
- **Loading States**: Smooth loading indicators during search operations
- **Network Error Recovery**: Automatic retry mechanisms

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the MeiliSearch documentation
2. Review the error messages in the browser console
3. Verify your environment variables are correctly set
4. Ensure MeiliSearch is running and accessible

---

**Happy Searching! 🔍**