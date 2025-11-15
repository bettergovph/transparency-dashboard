# PHILGEPS Search Application

A modern, responsive search interface for government procurement records built with Vite, React, TypeScript, Tailwind CSS v4, and MeiliSearch.

## ✨ Features

- **🔍 Smart Search**: Advanced search across all procurement fields with real-time results
- **📊 Interactive Dashboard**: Statistics and analytics for search results
- **🎨 Modern UI/UX**: Clean, professional design with Figtree font and black & white theme
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **⚡ Fast Performance**: Powered by MeiliSearch for instant search results
- **🛡️ Error Handling**: Comprehensive error boundaries and loading states
- **🔧 Environment Configuration**: Easy setup with environment variables

## 🛠️ Tech Stack

- **Frontend**: Vite, React 19, TypeScript
- **Styling**: Tailwind CSS v4, Figtree font, custom animations
- **Search Engine**: MeiliSearch with instant search capabilities
- **UI Components**: shadcn/ui, Lucide React icons
- **State Management**: React hooks with debounced search
- **Error Handling**: React Error Boundaries

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

## 🔧 MeiliSearch Setup

### Option 1: Docker (Recommended)

```bash
docker run -it --rm \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest
```

### Option 2: Binary Installation

Download and install MeiliSearch from the [official website](https://www.meilisearch.com/docs/learn/getting-started/installation).

### Indexing Data

Once MeiliSearch is running, you can index your procurement data:

```javascript
// Example indexing script
const { MeiliSearch } = require('meilisearch')

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'your_master_key'
})

const documents = [
  {
    id: '1',
    reference_id: 'REF-2024-001',
    contract_no: 'CON-2024-001',
    award_title: 'Supply and Delivery of Office Equipment',
    notice_title: 'Invitation to Bid - Office Equipment',
    awardee_name: 'ABC Office Supplies Corp.',
    organization_name: 'Department of Education',
    area_of_delivery: 'Metro Manila',
    business_category: 'Office Supplies',
    contract_amount: 2500000,
    award_date: '2024-01-15',
    award_status: 'Awarded'
  },
  // ... more documents
]

await client.index('philgeps').addDocuments(documents)
```

## 🎨 Customization

### Styling
- Edit `src/index.css` for global styles and animations
- Modify `tailwind.config.js` for Tailwind CSS configuration
- Update component styles in individual `.tsx` files

### Components
- **SearchInterface**: Main search component with filters and results
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

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Project Structure

```
philgeps/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── EnhancedSearchInterface.tsx
│   │   └── ErrorBoundary.tsx
│   ├── lib/
│   │   ├── meilisearch.ts  # MeiliSearch configuration
│   │   └── utils.ts        # Utility functions
│   ├── types/
│   │   └── search.ts       # TypeScript definitions
│   ├── data/
│   │   └── sampleData.ts   # Sample data for testing
│   ├── index.css           # Global styles
│   ├── App.tsx
│   └── main.tsx
├── .env.example            # Environment variables example
├── tailwind.config.js      # Tailwind CSS configuration
├── vite.config.ts          # Vite configuration
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