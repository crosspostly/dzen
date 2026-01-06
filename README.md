# 🔐 Dzen Auto-Publisher

Automated content generation and publishing system for Яндекс Дзен.

## 🚀 Quick Links

**Documentation**: [docs/INDEX.md](./docs/INDEX.md) - Complete documentation hub

**Getting Started**:
- [Setup Guide](./docs/getting-started/SETUP_GUIDE.md) - Installation and environment setup
- [Quick Start](./docs/getting-started/QUICK_START.md) - First article generation in 5 minutes

**Key Documentation**:
- [System Architecture](./docs/core/ARCHITECTURE.md) - System design and components
- [Pipeline Architecture](./docs/core/PIPELINE_ARCHITECTURE.md) - Complete generation pipeline
- [Quality Standards](./docs/standards/CONTENT_QUALITY_MATRIX.md) - Quality metrics and checklist

## 📋 Overview

This project automatically generates and publishes articles to Яндекс Дзен using AI-powered content generation, image synthesis, and quality assurance systems.

### Key Features
- **Multi-Agent Architecture**: Parallel episode generation with configurable concurrency
- **7 Archetype System**: Comeback Queen, Gold Digger Trap, Inheritance Reveal, Entrepreneur, Phoenix, Mother Wins, Wisdom Earned
- **Quality Pipeline**: 3-level cleanup system (prevention, AI cleanup, validation)
- **Image Processing**: AI-generated images with Canvas post-processing and mobile authenticity
- **RSS Feed Generation**: Compliant with Яндекс Дзen requirements
- **GitHub Actions Integration**: Automated workflows for deployment and testing

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Gemini API key (from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### Generate Your First Article

```bash
# Generate a single article
npm run generate

# Generate batch (1-100 articles)
npm run factory -- --count=10 --images

# Generate with both RAW and RESTORED versions
npm run both -- --count=5 --images
```

### Generate RSS Feed

```bash
# Incremental feed generation (new articles only)
npm run feed:incremental

# Full feed generation (all articles)
npm run feed:full
```

## 📊 Statistics

| Metric | Value |
|--------|-------|
| Article length | 15,000-30,000 characters |
| Generation time | ~30-40 seconds per article |
| Image count | 1 cover image per article |
| Archetypes | 7 story templates |
| Quality score | 70-100/100 average |

## 🔗 Resources

- **Documentation**: [docs/INDEX.md](./docs/INDEX.md)
- **GitHub Issues**: [Report issues and feature requests](https://github.com/crosspostly/dzen/issues)
- **GitHub Discussions**: [Community questions](https://github.com/crosspostly/dzen/discussions)

## 📄 License

MIT License - free to use and modify

---

**Last Updated**: January 6, 2026
**Status**: ✅ Production Ready
