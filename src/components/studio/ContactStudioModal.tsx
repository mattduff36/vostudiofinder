'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

interface ContactStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioName: string;
  studioId: string;
  ownerEmail: string;
}

export function ContactStudioModal({
  isOpen,
  onClose,
  studioName,
  studioId,
  ownerEmail,
}: ContactStudioModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sendCopyToSelf, setSendCopyToSelf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trim values for validation (matching server-side behavior)
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError('Please fill in all fields');
      return;
    }

    if (trimmedMessage.length < 40) {
      setError('Message must be at least 40 characters long');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact/studio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studioId,
          studioName,
          ownerEmail,
          senderName: name,
          senderEmail: email,
          message,
          sendCopyToSelf,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setSuccess(true);
      
      closeTimerRef.current = setTimeout(() => {
        handleClose();
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setName('');
    setEmail('');
    setMessage('');
    setSendCopyToSelf(false);
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-red-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Message {studioName}</h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
              <p className="text-gray-600">
                Your message has been sent to {studioName}. They will get back to you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Input
                label="Your Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />

              <Input
                label="Your Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="john@example.com"
                required
                disabled={isSubmitting}
              />

              {/* Send copy to self checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendCopyToSelf"
                  checked={sendCopyToSelf}
                  onChange={(e) => setSendCopyToSelf(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                />
                <label
                  htmlFor="sendCopyToSelf"
                  className="text-sm text-gray-700 cursor-pointer select-none"
                >
                  Send me a copy of this message
                </label>
              </div>

              <div>
                <Textarea
                  label="Message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, I'm interested in booking your studio..."
                  rows={6}
                  required
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className={message.trim().length < 40 ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                    {message.trim().length < 40 ? `${40 - message.trim().length} more characters needed` : 'Message requirement met'}
                  </span>
                  <span className={message.trim().length < 40 ? 'text-amber-600 font-semibold' : 'text-gray-500'}>
                    {message.trim().length}/40 characters minimum
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || message.trim().length < 40}
                  loading={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
