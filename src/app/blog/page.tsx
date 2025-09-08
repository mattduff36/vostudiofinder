'use client';

import { useState } from 'react';
import { Clock, User, Tag } from 'lucide-react';
import Image from 'next/image';

// Color scheme from the site
const colors = {
  primary: '#d42027',
  primaryHover: '#a1181d',
  background: '#ffffff',
  textPrimary: '#000000',
  textSecondary: '#444444',
  textSubtle: '#888888',
};

// Sample blog post data for demonstration
const samplePosts = [
  {
    id: 1,
    title: "The Ultimate Guide to Voice Acting in 2024",
    excerpt: "Discover the latest trends, techniques, and technologies shaping the voice acting industry this year.",
    content: "Voice acting has evolved tremendously over the past decade, with new technologies and platforms creating unprecedented opportunities for voice talent.",
    author: "Sarah Johnson",
    authorImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop",
    date: "2024-01-15",
    readTime: "8 min read",
    category: "Industry Insights",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800&h=400&fit=crop",
    tags: ["Voice Acting", "Industry", "Technology"]
  },
  {
    id: 2,
    title: "Setting Up Your Home Recording Studio on a Budget",
    excerpt: "Learn how to create a professional-quality recording space without breaking the bank.",
    content: "Creating a home recording studio doesn't have to cost a fortune. With the right knowledge and strategic purchases, you can build a setup that rivals professional studios.",
    author: "Mike Chen",
    authorImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop",
    date: "2024-01-12",
    readTime: "6 min read",
    category: "Equipment",
    image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&h=400&fit=crop",
    tags: ["Home Studio", "Budget", "Equipment"]
  },
  {
    id: 3,
    title: "Top 10 Microphones for Voice Over Work",
    excerpt: "A comprehensive review of the best microphones for professional voice over recording.",
    content: "Choosing the right microphone is crucial for voice over work. In this comprehensive guide, we'll explore the top 10 microphones that professionals swear by.",
    author: "Emma Rodriguez",
    authorImage: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop",
    date: "2024-01-10",
    readTime: "12 min read",
    category: "Equipment Reviews",
    image: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=800&h=400&fit=crop",
    tags: ["Microphones", "Reviews", "Professional"]
  },
  {
    id: 4,
    title: "Breaking into Commercial Voice Over: A Beginner's Guide",
    excerpt: "Everything you need to know to start your journey in commercial voice over work.",
    content: "Commercial voice over is one of the most lucrative areas of the voice acting industry. This guide will walk you through everything you need to know to get started.",
    author: "David Thompson",
    authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
    date: "2024-01-08",
    readTime: "10 min read",
    category: "Career Advice",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop",
    tags: ["Commercial", "Beginner", "Career"]
  },
  {
    id: 5,
    title: "The Psychology of Voice: How Tone Affects Your Audience",
    excerpt: "Understanding the psychological impact of voice tone and how to use it effectively.",
    content: "The human voice carries incredible power to influence emotions and decisions. Understanding the psychology behind vocal tone can dramatically improve your voice over performance.",
    author: "Dr. Lisa Park",
    authorImage: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop",
    date: "2024-01-05",
    readTime: "7 min read",
    category: "Psychology",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop",
    tags: ["Psychology", "Voice", "Performance"]
  },
  {
    id: 6,
    title: "Remote Recording: Best Practices for Working with Clients",
    excerpt: "Master the art of remote recording sessions and client collaboration.",
    content: "Remote recording has become the norm in today's voice over industry. Learn the best practices for conducting successful remote sessions and maintaining strong client relationships.",
    author: "Alex Morgan",
    authorImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop",
    date: "2024-01-03",
    readTime: "9 min read",
    category: "Remote Work",
    image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&h=400&fit=crop",
    tags: ["Remote", "Clients", "Recording"]
  }
];

export default function BlogPage() {
  const [selectedLayout, setSelectedLayout] = useState<'clean' | 'minimal' | 'studio'>('clean');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f9fafb' }}>
      {/* Header - Similar to home page style */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-3" style={{ color: colors.textPrimary }}>
              Voice Over Studio Blog
            </h1>
            <p className="text-lg text-center" style={{ color: colors.textSecondary, maxWidth: '768px', margin: '0 auto' }}>
              Insights, tips, and industry news for voice over professionals
            </p>
          </div>
        </div>
      </div>

      {/* Layout Selector - More subtle */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium mb-1" style={{ color: colors.textPrimary }}>
                Choose Your Preferred Layout:
              </h2>
              <p className="text-xs" style={{ color: colors.textSubtle }}>
                Demo page - select your favorite design for the final blog layout
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedLayout('clean')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                  selectedLayout === 'clean'
                    ? 'text-white shadow-sm'
                    : 'border border-gray-300 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: selectedLayout === 'clean' ? colors.primary : 'transparent',
                  color: selectedLayout === 'clean' ? 'white' : colors.textSecondary
                }}
              >
                Clean
              </button>
              <button
                onClick={() => setSelectedLayout('minimal')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                  selectedLayout === 'minimal'
                    ? 'text-white shadow-sm'
                    : 'border border-gray-300 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: selectedLayout === 'minimal' ? colors.primary : 'transparent',
                  color: selectedLayout === 'minimal' ? 'white' : colors.textSecondary
                }}
              >
                Minimal
              </button>
              <button
                onClick={() => setSelectedLayout('studio')}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-all ${
                  selectedLayout === 'studio'
                    ? 'text-white shadow-sm'
                    : 'border border-gray-300 hover:border-gray-400'
                }`}
                style={{
                  backgroundColor: selectedLayout === 'studio' ? colors.primary : 'transparent',
                  color: selectedLayout === 'studio' ? 'white' : colors.textSecondary
                }}
              >
                Studio
              </button>
            </div>
          </div>
        </div>

        {/* Render Selected Layout */}
        {selectedLayout === 'clean' && <CleanLayout posts={samplePosts} />}
        {selectedLayout === 'minimal' && <MinimalLayout posts={samplePosts} />}
        {selectedLayout === 'studio' && <StudioLayout posts={samplePosts} />}
      </div>
    </div>
  );
}

// Clean Layout - Similar to FeaturedStudios but for blog posts
function CleanLayout({ posts }: { posts: typeof samplePosts }) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <article 
            key={post.id} 
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-300 flex flex-col cursor-pointer group"
          >
            <div className="aspect-video bg-gray-200 rounded-t-lg overflow-hidden relative">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute bottom-2 right-2">
                <span 
                  className="inline-block px-2 py-1 text-xs font-medium rounded shadow-sm"
                  style={{ backgroundColor: '#f3f4f6', color: colors.textSecondary }}
                >
                  {post.category}
                </span>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
              <h3 className="text-lg font-semibold line-clamp-2 mb-3" style={{ color: colors.textPrimary }}>
                {post.title}
              </h3>
              
              <p className="text-sm line-clamp-3 mb-4" style={{ color: colors.textSecondary }}>
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-3">
                <div className="flex items-center">
                  <Image
                    src={post.authorImage}
                    alt={post.author}
                    width={24}
                    height={24}
                    className="rounded-full mr-2"
                  />
                  <div>
                    <p className="text-xs font-medium" style={{ color: colors.textPrimary }}>{post.author}</p>
                    <p className="text-xs" style={{ color: colors.textSubtle }}>{new Date(post.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center text-xs" style={{ color: colors.textSubtle }}>
                  <Clock className="w-3 h-3 mr-1" />
                  {post.readTime}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// Minimal Layout - Clean list style
function MinimalLayout({ posts }: { posts: typeof samplePosts }) {
  return (
    <div className="max-w-4xl">
      <div className="space-y-4">
        {posts.map((post) => (
          <article 
            key={post.id} 
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-sm hover:border-gray-300 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={post.image}
                  alt={post.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold line-clamp-2 pr-4" style={{ color: colors.textPrimary }}>
                    {post.title}
                  </h3>
                  <span 
                    className="text-xs px-2 py-1 rounded flex-shrink-0"
                    style={{ backgroundColor: '#f3f4f6', color: colors.textSubtle }}
                  >
                    {post.category}
                  </span>
                </div>
                
                <p className="text-sm line-clamp-2 mb-3" style={{ color: colors.textSecondary }}>
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-1" style={{ color: colors.textSubtle }} />
                      <span style={{ color: colors.textSubtle }}>{post.author}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" style={{ color: colors.textSubtle }} />
                      <span style={{ color: colors.textSubtle }}>{post.readTime}</span>
                    </div>
                  </div>
                  <span style={{ color: colors.textSubtle }}>{new Date(post.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// Studio Layout - Inspired by studios page design
function StudioLayout({ posts }: { posts: typeof samplePosts }) {
  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  return (
    <div>
      {/* Featured Post - Similar to studio detail style */}
      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8 hover:shadow-sm hover:border-gray-300 transition-all duration-200 cursor-pointer">
        <div className="md:flex">
          <div className="md:w-2/5">
            <div className="aspect-video relative overflow-hidden">
              <Image
                src={featuredPost.image}
                alt={featuredPost.title}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
          <div className="md:w-3/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span 
                className="text-xs px-2 py-1 rounded font-medium"
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                FEATURED
              </span>
              <span 
                className="text-xs px-2 py-1 rounded"
                style={{ backgroundColor: '#f3f4f6', color: colors.textSubtle }}
              >
                {featuredPost.category}
              </span>
            </div>
            <h2 className="text-xl font-semibold mb-3" style={{ color: colors.textPrimary }}>
              {featuredPost.title}
            </h2>
            <p className="text-sm mb-4 line-clamp-3" style={{ color: colors.textSecondary }}>
              {featuredPost.excerpt}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src={featuredPost.authorImage}
                  alt={featuredPost.author}
                  width={32}
                  height={32}
                  className="rounded-full mr-3"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: colors.textPrimary }}>{featuredPost.author}</p>
                  <p className="text-xs" style={{ color: colors.textSubtle }}>{new Date(featuredPost.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: colors.textSubtle }}>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {featuredPost.readTime}
                </div>
                <div className="flex gap-1">
                  {featuredPost.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="flex items-center">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Regular Posts - Studio card inspired */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {regularPosts.map((post) => (
          <article 
            key={post.id} 
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-sm hover:border-gray-300 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex">
              <div className="w-24 h-24 bg-gray-200 overflow-hidden flex-shrink-0">
                <Image
                  src={post.image}
                  alt={post.title}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 flex-grow min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold line-clamp-2 pr-2" style={{ color: colors.textPrimary }}>
                    {post.title}
                  </h3>
                  <span 
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ backgroundColor: '#f3f4f6', color: colors.textSubtle }}
                  >
                    {post.category}
                  </span>
                </div>
                <p className="text-xs line-clamp-2 mb-2" style={{ color: colors.textSecondary }}>
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: colors.textSubtle }}>{post.author}</span>
                  <div className="flex items-center gap-2" style={{ color: colors.textSubtle }}>
                    <span>{post.readTime}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
