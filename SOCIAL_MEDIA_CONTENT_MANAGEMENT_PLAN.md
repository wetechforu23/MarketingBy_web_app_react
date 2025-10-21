# 📱 Social Media Content Management System - Implementation Plan

**Date**: October 21, 2025  
**Branch**: `feature/social-media-content-management`  
**Status**: 📋 Planning Phase  
**Goal**: Build a comprehensive content creation, approval, and posting system for multi-platform social media management

---

## 🎯 Feature Overview

### What You Want to Build:
1. **Content Creation Portal** - For WeTechForU users and clients to create/upload content
2. **Multi-Platform Posting** - Facebook, LinkedIn, Instagram, Twitter, Google My Business, etc.
3. **Approval Workflow** - WeTechForU approval → Client approval → Post
4. **Content Validation** - Pre-posting checks for each platform's requirements
5. **Performance Tracking** - Track all posts across all platforms with analytics
6. **Scheduling System** - Show schedules in both WeTechForU dashboard and client portal
7. **Paid & Organic Posts** - Support for both regular posts and paid ads

---

## 📊 Current Infrastructure Analysis

### ✅ What You Already Have:

#### 1. **Facebook Integration (READY TO USE!)**
- ✅ `facebook_insights` table - Stores metrics
- ✅ `facebook_posts` table - Stores posts with engagement
- ✅ `facebook_follower_stats` table - Follower tracking
- ✅ `facebookService.ts` - Service for Facebook Graph API
- ✅ Facebook credential storage in `client_credentials`
- ✅ Sync functionality working

#### 2. **User Role System (PERFECT FOR APPROVALS)**
- ✅ `super_admin` - Full access
- ✅ `wtfu_*` roles - WeTechForU team (developer, sales, manager, project_manager)
- ✅ `client_admin` - Client admins
- ✅ `client_user` - Client users
- ✅ Permission-based access control
- ✅ Client isolation via `client_id`

#### 3. **Database Infrastructure**
- ✅ Multi-tenant design (all tables have `client_id`)
- ✅ Encrypted credentials storage (`client_credentials` table)
- ✅ Proper indexes for performance
- ✅ PostgreSQL on Heroku (stage server + dev database)

#### 4. **Frontend Components**
- ✅ Role-based navigation
- ✅ Client switcher (for super_admin)
- ✅ Social Media tab in dashboard
- ✅ Settings tab for integrations

---

## 🏗️ Recommended Architecture

### Database Schema (New Tables Needed)

```sql
-- ============================================================================
-- CONTENT MANAGEMENT TABLES
-- ============================================================================

-- 1. Social Media Content Library
CREATE TABLE IF NOT EXISTS social_media_content (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Content Details
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'video', 'carousel', 'story'
  content_text TEXT,
  media_urls TEXT[], -- Array of media URLs (images, videos)
  hashtags TEXT[], -- Array of hashtags
  mentions TEXT[], -- Array of mentions
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'pending_wtfu_approval', 'pending_client_approval', 'approved', 'rejected', 'posted', 'scheduled', 'failed'
  
  -- AI/Template Info (for future AI generation)
  is_ai_generated BOOLEAN DEFAULT false,
  template_id INTEGER,
  generation_prompt TEXT,
  
  UNIQUE(client_id, title)
);

-- 2. Posting Schedule & Plan
CREATE TABLE IF NOT EXISTS social_media_posts (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  content_id INTEGER REFERENCES social_media_content(id) ON DELETE CASCADE,
  
  -- Platform Details
  platform VARCHAR(50) NOT NULL, -- 'facebook', 'linkedin', 'instagram', 'twitter', 'google_business', 'tiktok'
  platform_account_id VARCHAR(255), -- Specific page/account ID on that platform
  
  -- Post Configuration
  post_type VARCHAR(50) NOT NULL, -- 'organic', 'paid_post', 'paid_story', 'paid_video'
  scheduled_time TIMESTAMP,
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'posting', 'posted', 'failed', 'cancelled'
  posted_at TIMESTAMP,
  platform_post_id VARCHAR(255), -- ID from the platform after posting
  platform_url TEXT, -- Direct URL to the post
  
  -- Approval Workflow
  wtfu_approved_by INTEGER REFERENCES users(id),
  wtfu_approved_at TIMESTAMP,
  wtfu_approval_notes TEXT,
  
  client_approved_by INTEGER REFERENCES users(id),
  client_approved_at TIMESTAMP,
  client_approval_notes TEXT,
  
  -- Paid Campaign (if applicable)
  is_paid BOOLEAN DEFAULT false,
  campaign_budget DECIMAL(10, 2),
  campaign_duration_days INTEGER,
  target_audience JSONB, -- Targeting parameters
  
  -- Error Handling
  last_attempt_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Platform Pre-Post Validation Rules
CREATE TABLE IF NOT EXISTS platform_validation_rules (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL UNIQUE,
  
  -- Content Limits
  max_text_length INTEGER,
  max_hashtags INTEGER,
  max_mentions INTEGER,
  max_images INTEGER,
  max_videos INTEGER,
  max_video_duration_seconds INTEGER,
  
  -- Supported Content Types
  supported_content_types TEXT[], -- ['text', 'image', 'video', 'carousel', 'story']
  
  -- Image Requirements
  min_image_width INTEGER,
  min_image_height INTEGER,
  max_image_width INTEGER,
  max_image_height INTEGER,
  supported_image_formats TEXT[], -- ['jpg', 'png', 'gif', 'webp']
  max_image_size_mb DECIMAL(5, 2),
  
  -- Video Requirements
  supported_video_formats TEXT[], -- ['mp4', 'mov', 'avi']
  max_video_size_mb DECIMAL(8, 2),
  
  -- Additional Rules (JSON for flexibility)
  additional_rules JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Post Performance Tracking (Unified across all platforms)
CREATE TABLE IF NOT EXISTS social_media_analytics (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES social_media_posts(id) ON DELETE CASCADE,
  
  -- Platform Info
  platform VARCHAR(50) NOT NULL,
  platform_post_id VARCHAR(255) NOT NULL,
  
  -- Engagement Metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Video Metrics (if applicable)
  video_views INTEGER DEFAULT 0,
  video_view_time_seconds INTEGER DEFAULT 0,
  
  -- Paid Campaign Metrics (if applicable)
  spend DECIMAL(10, 2) DEFAULT 0,
  cpc DECIMAL(10, 4) DEFAULT 0, -- Cost per click
  cpm DECIMAL(10, 4) DEFAULT 0, -- Cost per mille (1000 impressions)
  conversions INTEGER DEFAULT 0,
  
  -- Calculated Metrics
  engagement_rate DECIMAL(5, 2) DEFAULT 0, -- (likes + comments + shares) / reach * 100
  
  -- Metadata
  synced_at TIMESTAMP DEFAULT NOW(),
  recorded_at DATE DEFAULT CURRENT_DATE,
  
  UNIQUE(post_id, recorded_at)
);

-- 5. Approval History (Audit Trail)
CREATE TABLE IF NOT EXISTS content_approval_history (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES social_media_content(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES social_media_posts(id) ON DELETE CASCADE,
  
  -- Approval Details
  approval_type VARCHAR(50) NOT NULL, -- 'wtfu_approval', 'client_approval', 'rejection'
  approved_by INTEGER REFERENCES users(id),
  approval_status VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'changes_requested'
  notes TEXT,
  
  -- Changes Requested (if any)
  requested_changes JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Platform Credentials (Extend existing client_credentials)
-- Already exists, just document structure:
-- service_type values: 'facebook', 'linkedin', 'instagram', 'twitter', 'google_business'
-- credentials JSONB structure per platform documented below

-- 7. Content Templates (for future use)
CREATE TABLE IF NOT EXISTS content_templates (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, -- NULL = global template
  
  -- Template Details
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'promotional', 'educational', 'engagement', 'announcement'
  description TEXT,
  
  -- Template Content
  template_text TEXT,
  placeholder_variables TEXT[], -- ['practice_name', 'service_name', 'offer_details']
  suggested_hashtags TEXT[],
  suggested_platforms TEXT[], -- Which platforms this works best for
  
  -- Template Settings
  is_active BOOLEAN DEFAULT true,
  is_global BOOLEAN DEFAULT false, -- Available to all clients
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_social_content_client ON social_media_content(client_id);
CREATE INDEX idx_social_content_status ON social_media_content(status);
CREATE INDEX idx_social_content_created_by ON social_media_content(created_by);

CREATE INDEX idx_social_posts_client ON social_media_posts(client_id);
CREATE INDEX idx_social_posts_content ON social_media_posts(content_id);
CREATE INDEX idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_social_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_posts_scheduled ON social_media_posts(scheduled_time);
CREATE INDEX idx_social_posts_platform_id ON social_media_posts(platform_post_id);

CREATE INDEX idx_social_analytics_client ON social_media_analytics(client_id);
CREATE INDEX idx_social_analytics_post ON social_media_analytics(post_id);
CREATE INDEX idx_social_analytics_platform ON social_media_analytics(platform);
CREATE INDEX idx_social_analytics_recorded ON social_media_analytics(recorded_at DESC);

CREATE INDEX idx_approval_history_content ON content_approval_history(content_id);
CREATE INDEX idx_approval_history_post ON content_approval_history(post_id);
CREATE INDEX idx_approval_history_approver ON content_approval_history(approved_by);

CREATE INDEX idx_templates_client ON content_templates(client_id);
CREATE INDEX idx_templates_active ON content_templates(is_active) WHERE is_active = true;
```

---

## 🔌 Platform Integration Details

### 1. **Facebook** (Already Integrated!)
**Status**: ✅ Ready - Just need posting functionality

**Credentials Structure**:
```json
{
  "page_id": "123456789",
  "access_token": "EAA...",
  "page_name": "ProMed Healthcare"
}
```

**What Works Now**:
- ✅ Fetch insights
- ✅ Fetch posts
- ✅ Track engagement

**What to Add**:
- 🔨 Post creation (text + image)
- 🔨 Post scheduling
- 🔨 Story posting
- 🔨 Paid post boosting
- 🔨 Video upload

**API Endpoints Needed**:
```
POST /v18.0/{page-id}/feed
POST /v18.0/{page-id}/photos
POST /v18.0/{page-id}/videos
POST /v18.0/{page-id}/promotable_posts
```

**Content Validation Rules**:
- Text: Max 63,206 characters (but recommend 500-1000)
- Images: Max 4 images, 8MB each, min 600x315px
- Videos: Max 4GB, up to 240 minutes
- Hashtags: No official limit (30 recommended)

---

### 2. **LinkedIn**
**Status**: 🔨 Needs Integration

**Credentials Structure**:
```json
{
  "organization_id": "123456",
  "access_token": "AQV...",
  "organization_name": "ProMed Healthcare",
  "token_expires_at": "2025-12-31T00:00:00Z"
}
```

**API to Use**: LinkedIn Marketing Developer Platform
- LinkedIn API v2
- Requires LinkedIn Company Page
- OAuth 2.0 authentication

**API Endpoints Needed**:
```
POST /v2/ugcPosts (for text posts)
POST /v2/assets (for image upload)
POST /v2/videos (for video upload)
GET /v2/socialActions/{shareUrn}/likes (for analytics)
GET /v2/socialActions/{shareUrn}/comments
```

**Content Validation Rules**:
- Text: Max 3,000 characters (recommended 150-200)
- Images: Max 9 images, 5MB each, min 552x276px
- Videos: Max 5GB, 3-30 minutes
- Hashtags: Max 3-5 recommended

**Permissions Required**:
- `w_organization_social` - Post content
- `r_organization_social` - Read engagement
- `rw_organization_admin` - Admin access

---

### 3. **Instagram** (via Facebook Graph API)
**Status**: 🔨 Needs Integration (Easy - uses Facebook API)

**Credentials Structure**:
```json
{
  "instagram_account_id": "123456789",
  "access_token": "EAA...", // Same as Facebook
  "username": "promed_healthcare"
}
```

**API to Use**: Instagram Graph API (part of Facebook Graph API)
- Requires Instagram Business Account
- Must be linked to Facebook Page

**API Endpoints Needed**:
```
POST /v18.0/{ig-user-id}/media (create media container)
POST /v18.0/{ig-user-id}/media_publish (publish the post)
POST /v18.0/{ig-user-id}/media (for stories)
GET /v18.0/{ig-user-id}/insights
```

**Content Validation Rules**:
- Text (Caption): Max 2,200 characters
- Images: Max 1, 8MB, min 320px width, aspect ratio 1.91:1 to 4:5
- Videos: Max 100MB, 3-60 seconds for feed, 15 seconds for stories
- Hashtags: Max 30
- Carousel: Max 10 images/videos

---

### 4. **Twitter/X**
**Status**: 🔨 Needs Integration

**Credentials Structure**:
```json
{
  "api_key": "xxx",
  "api_secret": "xxx",
  "access_token": "xxx",
  "access_token_secret": "xxx",
  "bearer_token": "xxx"
}
```

**API to Use**: Twitter API v2
- Requires Twitter Developer Account
- Essential access (free): 1,500 tweets/month
- Basic access ($100/month): 3,000 tweets/month

**API Endpoints Needed**:
```
POST /2/tweets (create tweet)
POST /2/tweets (with media_ids for images)
GET /2/tweets/:id/metrics (analytics)
```

**Content Validation Rules**:
- Text: Max 280 characters (4,000 for Twitter Blue)
- Images: Max 4, 5MB each (JPEG, PNG, GIF, WEBP)
- Videos: Max 512MB, up to 2:20 minutes
- GIFs: Max 15MB
- Hashtags: Included in 280 character limit

**⚠️ Important**: Twitter API now has paid tiers. Recommend starting with Essential (free) for testing.

---

### 5. **Google My Business** (Google Business Profile)
**Status**: 🔨 Needs Integration

**Credentials Structure**:
```json
{
  "account_id": "123456789",
  "location_id": "987654321",
  "access_token": "ya29...",
  "refresh_token": "xxx",
  "business_name": "ProMed Healthcare"
}
```

**API to Use**: Google My Business API
- Requires Google Business Profile (free)
- OAuth 2.0 authentication

**API Endpoints Needed**:
```
POST /v1/{parent}/localPosts (create post)
GET /v1/{name}/localPosts (list posts)
GET /v1/{name}/insights (analytics)
```

**Content Validation Rules**:
- Text: Max 1,500 characters
- Images: Max 10, min 250x250px, max 5MB
- Videos: Max 100MB, max 30 seconds
- CTA buttons available: BOOK, ORDER, SHOP, LEARN_MORE, etc.

**Post Types**:
- Standard post
- Event post
- Offer post
- Product post

---

### 6. **TikTok** (Optional - Future)
**Status**: 🔮 Future Enhancement

**Credentials Structure**:
```json
{
  "access_token": "xxx",
  "refresh_token": "xxx",
  "user_id": "123456789"
}
```

**API to Use**: TikTok Content Posting API
- Requires TikTok Business Account
- Must apply for API access

**Content Validation Rules**:
- Video only: 3 seconds to 10 minutes
- Max 4GB file size
- Caption: Max 2,200 characters
- Hashtags: Max 30

---

## 🔄 Approval Workflow

### Step-by-Step Flow:

```
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: CONTENT CREATION                                        │
├──────────────────────────────────────────────────────────────────┤
│  • WeTechForU user OR Client creates content                     │
│  • Uploads media (images/videos)                                 │
│  • Writes caption, adds hashtags                                 │
│  • Selects target platforms                                      │
│  • Status: 'draft'                                               │
│  • Saved to: social_media_content table                          │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: PRE-VALIDATION                                          │
├──────────────────────────────────────────────────────────────────┤
│  • System checks against platform_validation_rules               │
│  • Validates:                                                    │
│    - Text length for each platform                               │
│    - Image dimensions & formats                                  │
│    - Video duration & size                                       │
│    - Hashtag count                                               │
│  • Shows warnings/errors if validation fails                     │
│  • User fixes issues                                             │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: SUBMIT FOR WETECHFORU APPROVAL                          │
├──────────────────────────────────────────────────────────────────┤
│  • User clicks "Submit for Approval"                             │
│  • Status: 'pending_wtfu_approval'                               │
│  • Email notification sent to WeTechForU team                    │
│  • Shows in WeTechForU approval queue                            │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: WETECHFORU REVIEW                                       │
├──────────────────────────────────────────────────────────────────┤
│  • WeTechForU manager reviews content                            │
│  • Options:                                                      │
│    ✅ APPROVE → Goes to Step 5                                   │
│    ❌ REJECT → Back to draft with notes                          │
│    📝 REQUEST CHANGES → Back to draft with specific changes      │
│  • Approval logged in: content_approval_history                  │
│  • If approved, status: 'pending_client_approval'                │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 5: CLIENT APPROVAL                                         │
├──────────────────────────────────────────────────────────────────┤
│  • Email notification sent to client_admin                       │
│  • Shows in client's approval queue (their portal)               │
│  • Client reviews content                                        │
│  • Options:                                                      │
│    ✅ APPROVE → Goes to Step 6                                   │
│    ❌ REJECT → Back to draft with notes                          │
│    📝 REQUEST CHANGES → Back to draft with specific changes      │
│  • Approval logged in: content_approval_history                  │
│  • If approved, status: 'approved'                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 6: SCHEDULING                                              │
├──────────────────────────────────────────────────────────────────┤
│  • User selects posting schedule                                 │
│  • Options:                                                      │
│    - Post immediately                                            │
│    - Schedule for specific date/time                             │
│  • Creates entries in: social_media_posts (one per platform)     │
│  • Status: 'scheduled' (or 'posting' if immediate)               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 7: POSTING (Automated Cron Job)                            │
├──────────────────────────────────────────────────────────────────┤
│  • Cron job runs every 5 minutes                                 │
│  • Finds posts where:                                            │
│    - status = 'scheduled'                                        │
│    - scheduled_time <= NOW()                                     │
│  • For each post:                                                │
│    1. Fetch content from social_media_content                    │
│    2. Fetch platform credentials from client_credentials         │
│    3. Final validation check                                     │
│    4. Call platform API to post                                  │
│    5. Update status: 'posted' (or 'failed' if error)             │
│    6. Store platform_post_id and platform_url                    │
│    7. Log attempt in post record                                 │
│  • Max 3 retry attempts if failure                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 8: PERFORMANCE TRACKING (Automated Sync)                   │
├──────────────────────────────────────────────────────────────────┤
│  • Daily cron job (runs at midnight)                             │
│  • For each posted content:                                      │
│    1. Fetch platform credentials                                 │
│    2. Call platform API for insights                             │
│    3. Store metrics in: social_media_analytics                   │
│  • Metrics tracked:                                              │
│    - Impressions, reach, engagement                              │
│    - Likes, comments, shares, saves                              │
│    - Video views, watch time                                     │
│    - Paid campaign spend & conversions                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend UI Components (New Pages/Tabs)

### 1. **Content Library Page** (New Page)
**Path**: `/app/content-library`  
**Access**: All authenticated users (role-filtered content)

**Features**:
- List all content for selected client
- Filter by status (draft, pending approval, approved, posted)
- Filter by platform
- Search by title/text
- Grid view with thumbnails
- Create New Content button

**Components**:
```tsx
<ContentLibrary>
  <ContentFilters />
  <ContentGrid>
    <ContentCard
      id={content.id}
      title={content.title}
      thumbnail={content.media_urls[0]}
      status={content.status}
      platforms={content.platforms}
      createdBy={content.created_by}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
    />
  </ContentGrid>
  <Pagination />
</ContentLibrary>
```

---

### 2. **Content Creation/Edit Page** (New Page)
**Path**: `/app/content-library/create` or `/app/content-library/:id/edit`  
**Access**: All authenticated users

**Features**:
- Rich text editor for caption
- Media upload (drag & drop)
  - Image uploader with preview
  - Video uploader with preview
  - Multi-file support
- Hashtag suggester
- Platform selector (checkboxes)
- Real-time character counter per platform
- Real-time validation warnings
- Preview for each platform
- Save as draft button
- Submit for approval button

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Create New Post                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title: [_____________________________]                     │
│                                                             │
│  Content:                                                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  [Rich text editor with formatting]                    │ │
│  │                                                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Characters: 145/280 (Twitter) | 145/3000 (LinkedIn)       │
│                                                             │
│  Hashtags: [____________________] [+ Add]                   │
│  #healthcare #medical #wellness                             │
│                                                             │
│  Media:                                                     │
│  ┌──────────┐ ┌──────────┐                                 │
│  │ [Image]  │ │ [+ Add]  │                                 │
│  │  Preview │ │   Media  │                                 │
│  └──────────┘ └──────────┘                                 │
│                                                             │
│  Target Platforms:                                          │
│  ☑ Facebook   ☑ LinkedIn   ☐ Instagram   ☐ Twitter         │
│  ☐ Google My Business                                       │
│                                                             │
│  Platform Preview:                                          │
│  [Tabs: Facebook | LinkedIn | Instagram]                   │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Preview how post will look on selected platform]     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ⚠ Validation Warnings:                                    │
│  • Twitter: Text exceeds 280 characters                     │
│  • Instagram: Requires at least 1 image                     │
│                                                             │
│  [Save as Draft]  [Submit for Approval]                     │
└─────────────────────────────────────────────────────────────┘
```

**Components**:
```tsx
<ContentEditor>
  <ContentForm>
    <TitleInput />
    <RichTextEditor />
    <CharacterCounter platforms={selectedPlatforms} />
    <HashtagInput />
    <MediaUploader />
    <PlatformSelector />
    <PlatformPreview platform={selectedPlatform} />
    <ValidationWarnings errors={validationErrors} />
    <ActionButtons>
      <Button onClick={saveDraft}>Save as Draft</Button>
      <Button onClick={submitForApproval}>Submit for Approval</Button>
    </ActionButtons>
  </ContentForm>
</ContentEditor>
```

---

### 3. **Approval Queue Page** (New Page)
**Path**: `/app/approvals`  
**Access**:
- WeTechForU users: See all pending WeTechForU approvals
- Client admins: See only their client's pending client approvals

**Features**:
- List of content pending approval
- Filter by client (for WeTechForU users)
- Quick preview of content
- Approve/Reject/Request Changes buttons
- Notes/feedback text area
- Bulk actions (approve multiple)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Approval Queue                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filters: [Client: All ▼] [Status: Pending ▼]              │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ☐  Post Title: "New Service Announcement"            │ │
│  │      Client: ProMed Healthcare                         │ │
│  │      Platforms: Facebook, LinkedIn                     │ │
│  │      Created by: John Doe (client_admin)               │ │
│  │      Submitted: 2 hours ago                            │ │
│  │                                                        │ │
│  │      [Preview] [Approve] [Reject] [Request Changes]    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  ☐  Post Title: "Health Tips for Winter"              │ │
│  │      Client: Align Primary Care                        │ │
│  │      Platforms: Instagram, Twitter                     │ │
│  │      Created by: Jane Smith (wtfu_developer)           │ │
│  │      Submitted: 1 day ago                              │ │
│  │                                                        │ │
│  │      [Preview] [Approve] [Reject] [Request Changes]    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [Bulk Approve Selected]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. **Posting Schedule Page** (New Page)
**Path**: `/app/content-schedule`  
**Access**: All authenticated users (role-filtered)

**Features**:
- Calendar view of scheduled posts
- List view option
- Filter by platform
- Filter by client (for WeTechForU users)
- Click to edit scheduled time
- Click to cancel/reschedule
- Color-coded by platform
- Status indicators (scheduled, posted, failed)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Content Schedule                         [Month ▼] [2025] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Calendar View] [List View]    Client: [ProMed ▼]         │
│                                                             │
│    Mon     Tue     Wed     Thu     Fri     Sat     Sun     │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐       │
│  │  1   │  2   │  3   │  4   │  5   │  6   │  7   │       │
│  │      │      │ 📘2p │      │ 📷9a │      │      │       │
│  │      │      │ 💼3p │      │      │      │      │       │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤       │
│  │  8   │  9   │ 10   │ 11   │ 12   │ 13   │ 14   │       │
│  │      │ 📘10a│      │ 📷1p │      │      │      │       │
│  │      │      │      │      │      │      │      │       │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘       │
│                                                             │
│  Legend: 📘 Facebook | 💼 LinkedIn | 📷 Instagram           │
│          🐦 Twitter | 📍 Google Business                    │
│                                                             │
│  Upcoming Posts (Next 7 Days):                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  📘 Oct 21, 2:00 PM - "New Service Announcement"      │ │
│  │     Facebook • ProMed Healthcare                       │ │
│  │     Status: ✅ Scheduled   [Edit] [Cancel]             │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  💼 Oct 21, 3:00 PM - "New Service Announcement"      │ │
│  │     LinkedIn • ProMed Healthcare                       │ │
│  │     Status: ✅ Scheduled   [Edit] [Cancel]             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 5. **Updated Social Media Tab** (Enhance Existing)
**Path**: `/app/client-management` → Social Media Tab  
**Access**: Existing access rules

**New Features to Add**:
- Performance comparison across all platforms
- Recent posts with engagement metrics
- Link to "View All Posts" (goes to Content Library filtered by status=posted)
- Link to "Create New Content"
- Link to "View Schedule"

**Enhanced Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Social Media Overview                    [Sync All Data]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Platform Performance (Last 30 Days):                       │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐ │
│  │  📘 Facebook │ 💼 LinkedIn  │ 📷 Instagram │ 🐦 Twitter│ │
│  ├──────────────┼──────────────┼──────────────┼──────────┤ │
│  │ Posts: 12    │ Posts: 8     │ Posts: 15    │ Posts: 20│ │
│  │ Reach: 5.2K  │ Reach: 3.1K  │ Reach: 8.4K  │ Views: 6K│ │
│  │ Engage: 8.2% │ Engage: 5.7% │ Engage: 12.3%│ Engage: 4%│ │
│  │ ✅ Connected │ ✅ Connected │ ⚠ Connect   │ ⚠ Connect│ │
│  └──────────────┴──────────────┴──────────────┴──────────┘ │
│                                                             │
│  Quick Actions:                                             │
│  [+ Create New Content]  [📅 View Schedule]  [📊 Analytics] │
│                                                             │
│  Recent Posts:                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  📘 "New Service Announcement"                         │ │
│  │     Posted: Oct 20, 2:00 PM • Reach: 850 • Engage: 45 │ │
│  │     👍 12  💬 8  🔗 5                                  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  💼 "Health Tips for Winter"                           │ │
│  │     Posted: Oct 19, 10:00 AM • Reach: 1.2K • Engage: 38│ │
│  │     👍 18  💬 6  🔗 14                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  [View All Posts]                                           │
└─────────────────────────────────────────────────────────────┘
```

---

### 6. **Platform Connection Settings** (Enhance Existing Settings Tab)
**Path**: `/app/client-management` → Settings Tab → Social Media Connections

**Add Sections for Each Platform**:
```
┌─────────────────────────────────────────────────────────────┐
│  Social Media Connections                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📘 Facebook                                                │
│  Status: ✅ Connected                                       │
│  Page: ProMed Healthcare (ID: 744651835408507)              │
│  Last Connected: Oct 20, 2025                               │
│  [Reconnect] [Disconnect]                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💼 LinkedIn                                                │
│  Status: ⚠ Not Connected                                   │
│  [Connect LinkedIn]                                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📷 Instagram                                               │
│  Status: ⚠ Not Connected                                   │
│  Note: Requires Facebook Page connection first              │
│  [Connect Instagram]                                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🐦 Twitter/X                                               │
│  Status: ⚠ Not Connected                                   │
│  [Connect Twitter]                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📍 Google My Business                                      │
│  Status: ⚠ Not Connected                                   │
│  [Connect Google Business]                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Access Control & Permissions

### WeTechForU Users (super_admin, wtfu_*)
**Can**:
- ✅ Create content for any client
- ✅ View all content for all clients
- ✅ Edit/delete any content (before approval)
- ✅ Approve content (wtfu approval step)
- ✅ View approval queue for all clients
- ✅ Schedule posts for any client
- ✅ View schedule for all clients
- ✅ View analytics for all clients
- ✅ Connect/disconnect platforms for any client
- ✅ Create content templates

**Cannot**:
- ❌ Skip approval workflow (must follow process)
- ❌ Post directly without approvals

---

### Client Admin (client_admin)
**Can**:
- ✅ Create content for their client only
- ✅ View all content for their client
- ✅ Edit/delete their client's content (before approval)
- ✅ Approve content (client approval step)
- ✅ View approval queue for their client
- ✅ Schedule posts for their client
- ✅ View schedule for their client
- ✅ View analytics for their client
- ✅ Connect/disconnect platforms for their client
- ✅ Manage other client users

**Cannot**:
- ❌ See other clients' data
- ❌ Skip approval workflow
- ❌ Post directly without approvals

---

### Client User (client_user)
**Can**:
- ✅ Create content for their client only
- ✅ View their client's content
- ✅ Edit their own drafts
- ✅ View schedule for their client (read-only)
- ✅ View analytics for their client (read-only)

**Cannot**:
- ❌ Approve content
- ❌ Delete content (unless their own draft)
- ❌ Schedule posts (only submit for approval)
- ❌ Connect/disconnect platforms
- ❌ See other clients' data

---

## 🛠️ Backend Services (New Services Needed)

### 1. `contentManagementService.ts`
```typescript
// Handles content CRUD operations
- createContent(clientId, data)
- updateContent(contentId, data)
- deleteContent(contentId)
- getContent(contentId)
- listContent(clientId, filters)
- duplicateContent(contentId)
- submitForApproval(contentId, approvalType)
```

### 2. `platformValidationService.ts`
```typescript
// Validates content against platform rules
- validateForPlatform(platform, content)
- getValidationRules(platform)
- checkTextLength(platform, text)
- checkMediaRequirements(platform, media)
- checkHashtagCount(platform, hashtags)
```

### 3. `approvalWorkflowService.ts`
```typescript
// Manages approval workflow
- submitForWTFUApproval(contentId, submittedBy)
- approveWTFU(contentId, approvedBy, notes)
- rejectWTFU(contentId, rejectedBy, notes)
- submitForClientApproval(contentId)
- approveClient(contentId, approvedBy, notes)
- rejectClient(contentId, rejectedBy, notes)
- requestChanges(contentId, requestedBy, changes)
- getApprovalHistory(contentId)
```

### 4. `socialMediaPostingService.ts`
```typescript
// Unified posting service for all platforms
- schedulePost(contentId, platforms, scheduledTime)
- postToFacebook(contentId, credentials)
- postToLinkedIn(contentId, credentials)
- postToInstagram(contentId, credentials)
- postToTwitter(contentId, credentials)
- postToGoogleBusiness(contentId, credentials)
- cancelScheduledPost(postId)
- retryFailedPost(postId)
```

### 5. `linkedInService.ts` (NEW)
```typescript
// LinkedIn-specific operations
- authenticate(credentials)
- createTextPost(organizationId, content, token)
- uploadImage(image, token)
- createImagePost(organizationId, content, imageUrn, token)
- uploadVideo(video, token)
- createVideoPost(organizationId, content, videoUrn, token)
- getPostAnalytics(shareUrn, token)
- getPostEngagement(shareUrn, token)
```

### 6. `instagramService.ts` (NEW)
```typescript
// Instagram-specific operations (via Facebook Graph API)
- createMediaContainer(igUserId, content, mediaUrl, token)
- publishMedia(igUserId, creationId, token)
- createStory(igUserId, mediaUrl, token)
- createCarousel(igUserId, mediaUrls, caption, token)
- getMediaInsights(mediaId, token)
```

### 7. `twitterService.ts` (NEW)
```typescript
// Twitter-specific operations
- authenticate(credentials)
- createTweet(text, credentials)
- uploadMedia(media, credentials)
- createTweetWithMedia(text, mediaIds, credentials)
- getTweetMetrics(tweetId, credentials)
```

### 8. `googleBusinessService.ts` (NEW)
```typescript
// Google My Business operations
- authenticate(credentials)
- createLocalPost(locationId, content, token)
- createEventPost(locationId, event, token)
- createOfferPost(locationId, offer, token)
- getPostInsights(postId, token)
- listPosts(locationId, token)
```

### 9. `socialMediaAnalyticsService.ts` (NEW)
```typescript
// Unified analytics for all platforms
- syncAllPlatforms(clientId)
- syncFacebookAnalytics(clientId)
- syncLinkedInAnalytics(clientId)
- syncInstagramAnalytics(clientId)
- syncTwitterAnalytics(clientId)
- syncGoogleBusinessAnalytics(clientId)
- getUnifiedAnalytics(clientId, dateRange)
- getPostPerformance(postId)
- getComparativeAnalytics(clientId, platforms)
```

### 10. `contentTemplateService.ts`
```typescript
// Content template management
- createTemplate(data)
- getTemplates(clientId)
- applyTemplate(templateId, variables)
- getGlobalTemplates()
```

---

## 🔄 Cron Jobs (Scheduled Background Tasks)

### 1. **Post Scheduler Cron**
**Frequency**: Every 5 minutes  
**Function**: Checks for scheduled posts and publishes them

```typescript
// backend/src/jobs/postScheduler.ts
export async function schedulePostCron() {
  // 1. Find posts where status='scheduled' AND scheduled_time <= NOW()
  // 2. For each post:
  //    - Fetch content
  //    - Fetch credentials
  //    - Call platform API
  //    - Update status to 'posted' or 'failed'
  //    - Store platform_post_id
  // 3. Send notifications if failed
  // 4. Log results
}
```

**Heroku Setup**:
```bash
# Add Heroku Scheduler addon
heroku addons:create scheduler:standard

# Configure via Heroku dashboard:
# Command: npm run cron:post-scheduler
# Frequency: Every 10 minutes
```

---

### 2. **Analytics Sync Cron**
**Frequency**: Once daily at midnight  
**Function**: Syncs analytics from all platforms

```typescript
// backend/src/jobs/analyticsSyncCron.ts
export async function analyticsSyncCron() {
  // 1. Get all clients with connected platforms
  // 2. For each client:
  //    - For each connected platform:
  //      - Fetch analytics for all posted content
  //      - Store in social_media_analytics table
  //      - Calculate engagement rates
  // 3. Log results
  // 4. Send reports if configured
}
```

**Heroku Setup**:
```bash
# Command: npm run cron:analytics-sync
# Frequency: Daily at 00:00 UTC
```

---

### 3. **Failed Post Retry Cron**
**Frequency**: Every 30 minutes  
**Function**: Retries failed posts (max 3 attempts)

```typescript
// backend/src/jobs/retryFailedPosts.ts
export async function retryFailedPostsCron() {
  // 1. Find posts where status='failed' AND attempt_count < 3
  // 2. For each post:
  //    - Check if enough time has passed since last attempt
  //    - Retry posting
  //    - Increment attempt_count
  //    - Update status
  // 3. Send notifications if all retries exhausted
}
```

---

### 4. **Token Refresh Cron**
**Frequency**: Daily  
**Function**: Refreshes OAuth tokens before they expire

```typescript
// backend/src/jobs/tokenRefreshCron.ts
export async function tokenRefreshCron() {
  // 1. Find credentials with expiring tokens (within 7 days)
  // 2. For each platform:
  //    - Call refresh token endpoint
  //    - Update credentials with new token
  //    - Update expiration date
  // 3. Send notifications if refresh fails
}
```

---

## 📋 API Endpoints (New Routes)

### Content Management Routes
```typescript
// backend/src/routes/content.ts

POST   /api/content                      // Create content
GET    /api/content                      // List content (filtered by client)
GET    /api/content/:id                  // Get single content
PUT    /api/content/:id                  // Update content
DELETE /api/content/:id                  // Delete content
POST   /api/content/:id/duplicate        // Duplicate content
POST   /api/content/:id/validate         // Validate for platforms

// Approval workflow
POST   /api/content/:id/submit-approval  // Submit for approval
POST   /api/content/:id/approve-wtfu     // WeTechForU approval
POST   /api/content/:id/reject-wtfu      // WeTechForU rejection
POST   /api/content/:id/approve-client   // Client approval
POST   /api/content/:id/reject-client    // Client rejection
POST   /api/content/:id/request-changes  // Request changes
GET    /api/content/:id/approval-history // Get approval history

// Posting & scheduling
POST   /api/content/:id/schedule         // Schedule post(s)
POST   /api/content/:id/post-now         // Post immediately
GET    /api/posts                        // List scheduled/posted
GET    /api/posts/:id                    // Get single post
PUT    /api/posts/:id/reschedule         // Reschedule post
DELETE /api/posts/:id                    // Cancel scheduled post
POST   /api/posts/:id/retry              // Retry failed post

// Analytics
GET    /api/analytics/unified/:clientId  // Unified analytics
GET    /api/analytics/post/:postId       // Single post analytics
GET    /api/analytics/comparative/:clientId // Compare platforms

// Templates
POST   /api/templates                    // Create template
GET    /api/templates                    // List templates
GET    /api/templates/:id                // Get template
PUT    /api/templates/:id                // Update template
DELETE /api/templates/:id                // Delete template
POST   /api/templates/:id/apply          // Apply template
```

### Platform Connection Routes
```typescript
// backend/src/routes/platforms.ts

// LinkedIn
POST   /api/platforms/linkedin/connect/:clientId
POST   /api/platforms/linkedin/disconnect/:clientId
GET    /api/platforms/linkedin/status/:clientId

// Instagram
POST   /api/platforms/instagram/connect/:clientId
POST   /api/platforms/instagram/disconnect/:clientId
GET    /api/platforms/instagram/status/:clientId

// Twitter
POST   /api/platforms/twitter/connect/:clientId
POST   /api/platforms/twitter/disconnect/:clientId
GET    /api/platforms/twitter/status/:clientId

// Google Business
POST   /api/platforms/google-business/connect/:clientId
POST   /api/platforms/google-business/disconnect/:clientId
GET    /api/platforms/google-business/status/:clientId

// Get all platform statuses
GET    /api/platforms/status/:clientId
```

### Approval Queue Routes
```typescript
// backend/src/routes/approvals.ts

GET    /api/approvals/pending           // Get pending approvals (role-filtered)
GET    /api/approvals/history           // Get approval history
GET    /api/approvals/stats             // Get approval stats
```

---

## 📦 Media Storage Strategy

### Option 1: **AWS S3** (Recommended)
**Pros**:
- Scalable & reliable
- CDN integration (CloudFront)
- Pay as you go
- Direct upload from frontend

**Setup**:
1. Create AWS S3 bucket
2. Configure CORS
3. Generate presigned URLs for uploads
4. Store URLs in database
5. Use CloudFront for fast delivery

**Cost**: ~$0.023/GB storage + $0.09/GB transfer

---

### Option 2: **Cloudinary** (Easy Alternative)
**Pros**:
- Easy to use
- Image/video transformation built-in
- Free tier: 25GB storage, 25GB bandwidth
- Upload widgets available

**Setup**:
1. Create Cloudinary account
2. Add credentials to database
3. Use Cloudinary upload widget
4. Store Cloudinary URLs

**Cost**: Free tier generous, then ~$99/month

---

### Option 3: **Heroku with External Storage**
**Pros**:
- Keep everything on Heroku
- Use addon like Bucketeer (S3 wrapper)

**Setup**:
```bash
heroku addons:create bucketeer:hobbyist
```

**Cost**: $5/month for 10GB

---

### Recommendation: **Start with Cloudinary**
- Free tier is generous
- Easy to implement
- Automatic image optimization
- Later migrate to S3 if needed

---

## 🔒 Security Considerations

### 1. **Platform Credentials**
- ✅ Store encrypted in database (already done)
- ✅ Never expose in frontend
- ✅ Use backend proxy for all API calls
- ✅ Implement token refresh logic
- ✅ Log all credential access

### 2. **Content Approval**
- ✅ Enforce approval workflow at database level
- ✅ Check permissions in middleware
- ✅ Audit trail for all approvals
- ✅ Prevent bypassing approval with direct API calls

### 3. **Media Upload**
- ✅ Validate file types
- ✅ Scan for malware (use ClamAV or similar)
- ✅ Limit file sizes
- ✅ Use presigned URLs (no direct server uploads)
- ✅ Watermark images if needed

### 4. **Rate Limiting**
- ✅ Respect platform API limits
- ✅ Implement queue system for posting
- ✅ Track API usage per platform
- ✅ Warn before reaching limits

---

## 📊 API Quota Tracking

### Platform Limits to Track:

```sql
CREATE TABLE IF NOT EXISTS api_quota_tracking (
  id SERIAL PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  client_id INTEGER REFERENCES clients(id),
  
  -- Quota Limits
  endpoint VARCHAR(255),
  quota_limit INTEGER,
  quota_period VARCHAR(50), -- 'hourly', 'daily', 'monthly'
  quota_used INTEGER DEFAULT 0,
  
  -- Reset Info
  quota_reset_at TIMESTAMP,
  
  -- Warnings
  warning_threshold INTEGER, -- Alert at this percentage
  alert_sent BOOLEAN DEFAULT false,
  
  -- Metadata
  recorded_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(platform, client_id, endpoint, quota_period)
);
```

### Platforms with Paid Tiers:
1. **Twitter/X**: 1,500 tweets/month (free), then paid
2. **LinkedIn**: 100 posts/day per organization (free)
3. **Facebook**: 200 calls/hour per user (free)
4. **Instagram**: 200 calls/hour per user (free)
5. **Google My Business**: 1,500 queries/day (free)

### Implement Tracking:
```typescript
// Before each API call
await checkQuotaLimit(platform, clientId, endpoint);
await incrementQuotaUsage(platform, clientId, endpoint);
await checkWarningThreshold(platform, clientId);
```

---

## 🧪 Testing Strategy

### Phase 1: Facebook Only (Week 1)
- ✅ Use existing Facebook integration
- 🔨 Add posting functionality
- 🔨 Test approval workflow
- 🔨 Test scheduling
- 🔨 Test analytics sync
- ✅ Already have test data

### Phase 2: LinkedIn (Week 2)
- 🔨 Implement LinkedIn service
- 🔨 Test OAuth flow
- 🔨 Test text posts
- 🔨 Test image posts
- 🔨 Test analytics

### Phase 3: Instagram (Week 3)
- 🔨 Implement Instagram service
- 🔨 Link to Facebook
- 🔨 Test posts
- 🔨 Test stories
- 🔨 Test analytics

### Phase 4: Others (Week 4+)
- 🔨 Twitter
- 🔨 Google My Business
- 🔨 TikTok (optional)

---

## 📈 Implementation Phases

### **PHASE 1: Foundation (Week 1-2)** - START HERE
**Goal**: Get basic content management + Facebook posting working

**Database**:
- ✅ Create `social_media_content` table
- ✅ Create `social_media_posts` table
- ✅ Create `content_approval_history` table
- ✅ Create `platform_validation_rules` table (seed Facebook rules)
- ✅ Create indexes

**Backend**:
- 🔨 `contentManagementService.ts` (CRUD operations)
- 🔨 `platformValidationService.ts` (Facebook validation only)
- 🔨 `approvalWorkflowService.ts` (full workflow)
- 🔨 Enhance `facebookService.ts` (add posting methods)
- 🔨 `socialMediaPostingService.ts` (Facebook only)
- 🔨 API routes: `/api/content/*`, `/api/posts/*`, `/api/approvals/*`

**Frontend**:
- 🔨 Content Library page
- 🔨 Content Creation/Edit page (basic)
- 🔨 Approval Queue page
- 🔨 Platform selector (Facebook only for now)
- 🔨 Enhance Social Media tab

**Testing**:
- 🔨 Create test content
- 🔨 Test approval workflow
- 🔨 Test Facebook posting
- 🔨 Verify on ProMed's Facebook page

**Confirmation Required** (per your rules):
❓ DDL on dev database: Please type **CONFIRM PHASE1DB** to create new tables

---

### **PHASE 2: LinkedIn Integration (Week 3)**
**Goal**: Add LinkedIn support

**Database**:
- ✅ Add LinkedIn validation rules to `platform_validation_rules`

**Backend**:
- 🔨 `linkedInService.ts` (full implementation)
- 🔨 Update `platformValidationService.ts` (add LinkedIn)
- 🔨 Update `socialMediaPostingService.ts` (add LinkedIn)
- 🔨 API routes: `/api/platforms/linkedin/*`

**Frontend**:
- 🔨 LinkedIn OAuth connection flow
- 🔨 Update platform selector (add LinkedIn)
- 🔨 Update preview (add LinkedIn preview)

**Testing**:
- 🔨 Connect LinkedIn account
- 🔨 Post to LinkedIn
- 🔨 Verify analytics

---

### **PHASE 3: Instagram + Multi-Platform (Week 4)**
**Goal**: Add Instagram + improve multi-platform UX

**Database**:
- ✅ Add Instagram validation rules

**Backend**:
- 🔨 `instagramService.ts` (via Facebook Graph API)
- 🔨 Update validation & posting services

**Frontend**:
- 🔨 Instagram connection flow
- 🔨 Update platform selector
- 🔨 Update preview
- 🔨 Multi-platform validation warnings

**Testing**:
- 🔨 Post to multiple platforms simultaneously
- 🔨 Test carousel posts
- 🔨 Test stories

---

### **PHASE 4: Scheduling & Analytics (Week 5)**
**Goal**: Automated scheduling + unified analytics

**Database**:
- ✅ Create `social_media_analytics` table
- ✅ Create `api_quota_tracking` table

**Backend**:
- 🔨 `socialMediaAnalyticsService.ts`
- 🔨 Cron job: `postScheduler.ts`
- 🔨 Cron job: `analyticsSyncCron.ts`
- 🔨 Cron job: `retryFailedPosts.ts`
- 🔨 API routes: `/api/analytics/*`

**Frontend**:
- 🔨 Schedule page (calendar view)
- 🔨 Enhanced analytics dashboard
- 🔨 Performance comparison charts

**Heroku**:
- 🔨 Configure Heroku Scheduler
- 🔨 Test cron jobs

---

### **PHASE 5: Additional Platforms (Week 6+)**
**Goal**: Twitter, Google Business, Templates

**As needed per priority**

---

### **PHASE 6: Client Portal (Week 7+)**
**Goal**: Separate portal for clients to manage their own content

**Features**:
- Client-specific dashboard
- Simplified content creation
- Approval viewing
- Performance reports
- Branded white-label (optional)

---

## 🎯 Recommendations Summary

### ✅ **What to Do First** (Priority Order):

1. **Create New Branch** ✅ DONE (`feature/social-media-content-management`)

2. **Get Confirmation** ⏳ WAITING
   - Type **CONFIRM PHASE1DB** to proceed with database changes

3. **Phase 1: Database Setup**
   - Run migration to create 4 core tables
   - Seed `platform_validation_rules` with Facebook rules
   - Test on dev database first

4. **Phase 1: Backend Services**
   - Build `contentManagementService.ts`
   - Build `approvalWorkflowService.ts`
   - Enhance `facebookService.ts` with posting
   - Add API routes

5. **Phase 1: Frontend Pages**
   - Content Library page
   - Content Editor page
   - Approval Queue page

6. **Phase 1: Testing**
   - Create test content
   - Test full approval workflow
   - Post to ProMed's Facebook (with approval)

7. **Phase 2+: Expand**
   - Add LinkedIn
   - Add Instagram
   - Add scheduling
   - Add other platforms

---

## 🚨 Important Notes

### 1. **Always Use Stage Server + Dev Database** ✅
- Per your rules, all local work uses:
  - Stage backend server
  - Dev/local database
- Never modify stage database without double confirmation

### 2. **Reuse Existing Infrastructure** ✅
- ✅ Facebook service already exists
- ✅ User roles ready for approvals
- ✅ Client isolation already working
- ✅ Credential storage already secure

### 3. **No Secrets in Code** ✅
- All platform credentials stored encrypted in database
- Access via DB services only
- Never commit tokens/keys to Git

### 4. **Feature Flags for Rollout** 🔨
- Add feature flag: `social_media_management_enabled`
- Enable per client for gradual rollout
- Easy rollback if needed

### 5. **API Quota Monitoring** 🔨
- Track all platform API calls
- Warn before free tier limits
- Require **CONFIRM BILLING** before paid tier usage

---

## 📝 Next Steps - What to Tell Me

**Please confirm**:

1. ✅ Does this architecture make sense for your needs?
2. ✅ Do you want to start with Phase 1 (Facebook only)?
3. ⏳ **Type "CONFIRM PHASE1DB"** to create the database tables
4. ✅ Which client should we test with first? (ProMed or Align Primary?)
5. ✅ Do you want media storage via Cloudinary (free tier)?

**Once you confirm**, I'll:
1. Create the database migration files
2. Build the backend services
3. Create the frontend components
4. Set up the approval workflow
5. Test with Facebook first

---

## 📚 Reference Links

### APIs Documentation:
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [LinkedIn API](https://learn.microsoft.com/en-us/linkedin/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Twitter API](https://developer.twitter.com/en/docs/twitter-api)
- [Google My Business API](https://developers.google.com/my-business)

### Tools:
- [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [LinkedIn API Console](https://www.linkedin.com/developers/tools)
- [Twitter API Console](https://developer.twitter.com/en/portal/dashboard)

---

**Ready to build this! Just need your confirmation to proceed.** 🚀

---

## Versioned Change Log
*(To be added to master file after each phase)*

### v1.0.0 - Planning Phase - Oct 21, 2025
- **Feature**: Social Media Content Management System
- **Status**: Planning Complete
- **Impacted**: New tables, services, APIs, frontend pages
- **Migration Plan**: Phase 1-6 rollout
- **Rollback**: Feature flag controlled
- **Quota Tracking**: API limits monitored per platform

