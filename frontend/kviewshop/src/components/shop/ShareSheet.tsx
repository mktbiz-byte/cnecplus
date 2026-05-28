'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Share2, Copy, MessageCircle, FileText, Globe, Phone, Twitter } from 'lucide-react';
import { buildShareUrl } from '@/lib/share';
import { sendKakaoShare } from '@/lib/kakao';

interface ShareSheetProps {
  url: string;
  title: string;
  description: string;
  imageUrl?: string;
  trigger?: React.ReactNode;
}

export function ShareSheet({ url, title, description, imageUrl, trigger }: ShareSheetProps) {
  const [open, setOpen] = useState(false);

  const handleCopyLink = async () => {
    const shareUrl = buildShareUrl(url, 'copy');
    await navigator.clipboard.writeText(shareUrl);
    toast.success('링크가 복사되었습니다!');
    setOpen(false);
  };

  const handleKakaoShare = () => {
    const shareUrl = buildShareUrl(url, 'kakao');
    const sent = sendKakaoShare({ title, description, imageUrl, linkUrl: shareUrl });
    if (!sent) {
      // Fallback: copy link
      navigator.clipboard.writeText(shareUrl);
      toast.success('카카오톡 SDK가 로드되지 않아 링크가 복사되었습니다');
    }
    setOpen(false);
  };

  const handleCopyCaption = async () => {
    const shareUrl = buildShareUrl(url, 'instagram');
    const caption = `${title}\n${description}\n\n${shareUrl}`;
    await navigator.clipboard.writeText(caption);
    toast.success('캡션이 복사되었습니다!');
    setOpen(false);
  };

  const handleFacebookShare = () => {
    const shareUrl = buildShareUrl(url, 'copy');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  const handleXShare = () => {
    const shareUrl = buildShareUrl(url, 'copy');
    const text = `${title} - ${description}`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400');
    setOpen(false);
  };

  const handleWhatsAppShare = () => {
    const shareUrl = buildShareUrl(url, 'copy');
    const text = `${title}\n${description}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon" className="shrink-0">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>공유</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleCopyLink}
          >
            <Copy className="h-5 w-5 text-gray-500" />
            링크 복사
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleKakaoShare}
          >
            <MessageCircle className="h-5 w-5 text-yellow-500" />
            카카오톡 공유
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleCopyCaption}
          >
            <FileText className="h-5 w-5 text-pink-500" />
            캡션 + 링크 복사
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleFacebookShare}
          >
            <Globe className="h-5 w-5 text-blue-600" />
            Facebook
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleXShare}
          >
            <Twitter className="h-5 w-5 text-gray-900" />
            X (Twitter)
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3"
            onClick={handleWhatsAppShare}
          >
            <Phone className="h-5 w-5 text-green-500" />
            WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
