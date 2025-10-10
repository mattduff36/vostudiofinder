'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Phone, User, Clock } from 'lucide-react';

const contactSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters long').max(2000),
  contactEmail: z.string().email('Please enter a valid email address').optional(),
  contactPhone: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactStudioProps {
  studio: {
    id: string;
    name: string;
    website_url?: string;
    phone?: string;
    owner: {
      id: string;
      display_name: string;
      username: string;
      avatar_url?: string;
    };
  };
}

export function ContactStudio({ studio }: ContactStudioProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: '',
      message: '',
      contactEmail: session?.user?.email || '',
      contactPhone: '',
    },
  });

  const submitMessage = async (data: ContactFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: studio.owner.id,
          studioId: studio.id,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      setSuccess('Your message has been sent successfully! The studio owner will receive your inquiry and respond directly.');
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Contact Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Contact {studio.name}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Direct Contact */}
          {(studio.phone || studio.website_url) && (
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="font-medium text-text-primary mb-2">Direct Contact</h3>
              <div className="space-y-2">
                {studio.phone && (
                  <a
                    href={`tel:${studio.phone}`}
                    className="block text-sm text-primary-600 hover:text-primary-700"
                  >
                    {studio.phone}
                  </a>
                )}
                {studio.website_url && (
                  <a
                    href={studio.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-primary-600 hover:text-primary-700"
                  >
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Message Owner */}
          <div className="text-center">
            <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6 text-accent-600" />
            </div>
            <h3 className="font-medium text-text-primary mb-2">Send Message</h3>
            <p className="text-sm text-text-secondary">
              Contact the studio owner directly through our secure messaging system
            </p>
          </div>

          {/* Response Time */}
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium text-text-primary mb-2">Quick Response</h3>
            <p className="text-sm text-text-secondary">
              Most studio owners respond within 24 hours
            </p>
          </div>
        </div>

        {/* Studio Owner Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            {studio.owner.avatar_url ? (
              <img
                src={studio.owner.avatar_url}
                alt={studio.owner.display_name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            )}
            <div>
              <p className="font-medium text-text-primary">{studio.owner.display_name}</p>
              <p className="text-sm text-text-secondary">Studio Owner • @{studio.owner.username}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">Send a Message</h3>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {!session ? (
          <div className="text-center py-8">
            <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Sign in to Contact Studio</h3>
            <p className="text-text-secondary mb-4">
              You need to be signed in to send messages to studio owners.
            </p>
            <div className="space-x-4">
              <Button
                onClick={() => window.location.href = '/auth/signin'}
                variant="outline"
              >
                Sign In
              </Button>
              <Button
                onClick={() => window.location.href = '/auth/signup'}
              >
                Sign Up
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submitMessage)} className="space-y-6">
            {/* Subject */}
            <Input
              label="Subject *"
              placeholder="Inquiry about studio booking"
              error={errors.subject?.message || ''}
              {...register('subject')}
            />

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Message *
              </label>
              <textarea
                rows={6}
                placeholder="Hi! I'm interested in booking your studio for a voiceover project. Could you please provide more information about availability, rates, and booking process?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                {...register('message')}
              />
              {errors.message && (
                <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
              )}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Your Email (optional)"
                type="email"
                placeholder="your@email.com"
                error={errors.contactEmail?.message || ''}
                helperText="We'll use your account email if not provided"
                {...register('contactEmail')}
              />

              <Input
                label="Your Phone (optional)"
                type="tel"
                placeholder="+1 (555) 123-4567"
                error={errors.contactPhone?.message || ''}
                helperText="For urgent inquiries"
                {...register('contactPhone')}
              />
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Tips for Better Response</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Include your project details and timeline</li>
                <li>• Mention your budget range if possible</li>
                <li>• Ask specific questions about equipment or services</li>
                <li>• Be professional and courteous</li>
              </ul>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                type="submit"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
