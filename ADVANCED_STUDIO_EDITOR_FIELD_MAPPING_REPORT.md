# Advanced Studio Editor Field Mapping Report

## Overview
This document maps every field in the Advanced Studio Editor to its corresponding database source. This is critical for ensuring both frontends display the correct information from the shared database.

## Database Schema Reference
- **Users Table**: `users` - Contains basic user information
- **User Profiles Table**: `user_profiles` - Contains detailed profile information  
- **Studios Table**: `studios` - Contains studio-specific information

## Field Mappings by Tab

### 1. Basic Info Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Username** | `profile.username` | `users.username` | URL-friendly identifier (e.g., "VoiceoverGuy") |
| **First Name** | `profile._meta.first_name` | `user_profiles.firstName` | HTML entities decoded |
| **Email** | `profile.email` | `users.email` | User's email address |
| **Short About** | `profile._meta.shortabout` | `user_profiles.shortAbout` | HTML entities decoded |
| **Full About** | `profile._meta.about` | `user_profiles.about` | **CRITICAL**: HTML entities decoded, full text |
| **Status** | `profile.status` | `studios.status` | Converted to lowercase ("active"/"inactive") |
| **Verified** | `profile._meta.verified` | `studios.isVerified` | Boolean converted to '1'/'0' |
| **Featured** | `profile._meta.featured` | `user_profiles.isFeatured` | Boolean converted to '1'/'0' |

### 2. Contact Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Phone** | `profile._meta.phone` | `user_profiles.phone` | Contact phone number |
| **Website URL** | `profile._meta.url` | `studios.websiteUrl` | Studio website URL |
| **Show Email** | `profile._meta.showemail` | `user_profiles.showEmail` | Boolean converted to '1'/'0' |
| **Show Phone** | `profile._meta.showphone` | `user_profiles.showPhone` | Boolean converted to '1'/'0' |
| **Show Map** | `profile._meta.showmap` | `user_profiles.showMap` | Boolean converted to '1'/'0' |
| **Show Directions** | `profile._meta.showdirections` | `user_profiles.showDirections` | Boolean converted to '1'/'0' |
| **Show Address** | `profile._meta.showaddress` | `user_profiles.showAddress` | Boolean converted to '1'/'0' |
| **Show Short About** | `profile._meta.showshort` | `user_profiles.showShortAbout` | Boolean converted to '1'/'0' |

### 3. Social Media Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Twitter** | `profile._meta.twitter` | `user_profiles.twitterUrl` | Twitter profile URL |
| **Show Twitter** | `profile._meta.twittershow` | `user_profiles.showTwitter` | Boolean converted to '1'/'0' |
| **Facebook** | `profile._meta.facebook` | `user_profiles.facebookUrl` | Facebook profile URL |
| **Show Facebook** | `profile._meta.facebookshow` | `user_profiles.showFacebook` | Boolean converted to '1'/'0' |
| **LinkedIn** | `profile._meta.linkedin` | `user_profiles.linkedinUrl` | LinkedIn profile URL |
| **Show LinkedIn** | `profile._meta.linkedinshow` | `user_profiles.showLinkedIn` | Boolean converted to '1'/'0' |
| **Instagram** | `profile._meta.instagram` | `user_profiles.instagramUrl` | Instagram profile URL |
| **Show Instagram** | `profile._meta.instagramshow` | `user_profiles.showInstagram` | Boolean converted to '1'/'0' |
| **YouTube Page** | `profile._meta.youtubepage` | `user_profiles.youtubeUrl` | YouTube channel URL |
| **Show YouTube** | `profile._meta.youtubepageshow` | `user_profiles.showYouTube` | Boolean converted to '1'/'0' |
| **SoundCloud** | `profile._meta.soundcloud` | `user_profiles.soundcloudUrl` | SoundCloud profile URL |
| **Show SoundCloud** | `profile._meta.soundcloudshow` | `user_profiles.showSoundCloud` | Boolean converted to '1'/'0' |
| **Pinterest** | `profile._meta.pinterest` | `user_profiles.pinterestUrl` | Pinterest profile URL |
| **Show Pinterest** | `profile._meta.pinterestshow` | `user_profiles.showPinterest` | Boolean converted to '1'/'0' |
| **TikTok** | `profile._meta.tiktok` | `user_profiles.tiktokUrl` | TikTok profile URL |

### 4. Media Links Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **YouTube Video ID** | `profile._meta.youtube` | `user_profiles.youtubeVideoId` | Video ID only |
| **Vimeo Page** | `profile._meta.vimeopage` | `user_profiles.vimeoUrl` | Vimeo channel URL |
| **Show Vimeo Page** | `profile._meta.vimeopageshow` | `user_profiles.showVimeo` | Boolean converted to '1'/'0' |
| **SoundCloud Link 1** | `profile._meta.soundcloudlink` | `user_profiles.soundcloudLink1` | Additional SoundCloud link |
| **SoundCloud Link 2** | `profile._meta.soundcloudlink2` | `user_profiles.soundcloudLink2` | Additional SoundCloud link |
| **SoundCloud Link 3** | `profile._meta.soundcloudlink3` | `user_profiles.soundcloudLink3` | Additional SoundCloud link |
| **SoundCloud Link 4** | `profile._meta.soundcloudlink4` | `user_profiles.soundcloudLink4` | Additional SoundCloud link |
| **SoundCloud Username** | `profile._meta.sc` | `user_profiles.soundcloudUsername` | SoundCloud username |

### 5. Connections Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Source Connect** | `profile._meta.connection1` | `user_profiles.connection1` | Boolean converted to '1'/'0' |
| **Source Connect Now** | `profile._meta.connection2` | `user_profiles.connection2` | Boolean converted to '1'/'0' |
| **Phone Patch** | `profile._meta.connection3` | `user_profiles.connection3` | Boolean converted to '1'/'0' |
| **Session Link Pro** | `profile._meta.connection4` | `user_profiles.connection4` | Boolean converted to '1'/'0' |
| **Zoom or Teams** | `profile._meta.connection5` | `user_profiles.connection5` | Boolean converted to '1'/'0' |
| **Cleanfeed** | `profile._meta.connection6` | `user_profiles.connection6` | Boolean converted to '1'/'0' |
| **Riverside** | `profile._meta.connection7` | `user_profiles.connection7` | Boolean converted to '1'/'0' |
| **Google Hangouts** | `profile._meta.connection8` | `user_profiles.connection8` | Boolean converted to '1'/'0' |
| **ISDN** | `profile._meta.connection9` | `user_profiles.connection9` | Boolean converted to '1'/'0' |
| **Skype** | `profile._meta.connection10` | `user_profiles.connection10` | Boolean converted to '1'/'0' |
| **Audio TX** | `profile._meta.connection11` | `user_profiles.connection11` | Boolean converted to '1'/'0' |
| **ipDTL** | `profile._meta.connection12` | `user_profiles.connection12` | Boolean converted to '1'/'0' |
| **Custom Connection 1** | `profile._meta.custom_connection1` | `user_profiles.customConnection1` | Free text field |
| **Custom Connection 2** | `profile._meta.custom_connection2` | `user_profiles.customConnection2` | Free text field |
| **Custom Connection 3** | `profile._meta.custom_connection3` | `user_profiles.customConnection3` | Free text field |

### 6. Location Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Location** | `profile._meta.location` | `user_profiles.location` | City/region |
| **Locale** | `profile._meta.locale` | `user_profiles.locale` | Locale setting |
| **Full Address** | `profile._meta.address` | `studios.address` | Complete address |
| **Latitude** | `profile._meta.latitude` | `studios.latitude` | Geographic latitude |
| **Longitude** | `profile._meta.longitude` | `studios.longitude` | Geographic longitude |

### 7. Rates & Display Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **15 Minutes Rate** | `profile._meta.rates1` | `user_profiles.rateTier1` | **CRITICAL**: HTML entities decoded (£80) |
| **30 Minutes Rate** | `profile._meta.rates2` | `user_profiles.rateTier2` | **CRITICAL**: HTML entities decoded (£100) |
| **60 Minutes Rate** | `profile._meta.rates3` | `user_profiles.rateTier3` | **CRITICAL**: HTML entities decoded (£125) |
| **Show Rates** | `profile._meta.showrates` | `user_profiles.showRates` | Boolean converted to '1'/'0' |
| **Homepage 1** | `profile._meta.homepage1` | `user_profiles.homepage1` | Boolean converted to '1'/'0' |
| **Homepage 2** | `profile._meta.homepage2` | `user_profiles.homepage2` | Boolean converted to '1'/'0' |
| **Home Color** | `profile._meta.homecolour` | `user_profiles.homeColor` | Color theme setting |

### 8. Images Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Images** | `images` array | `studio_images` table | Cloudinary URLs and metadata |
| **Primary Image** | `image.is_primary` | `studio_images.isPrimary` | Boolean flag |

### 9. Advanced Tab

| Frontend Field | Database Source | Table.Column | Notes |
|---|---|---|---|
| **Last Login** | `profile._meta.last_login` | `users.lastLogin` | Timestamp |
| **Last Login IP** | `profile._meta.last_login_ip` | `users.lastLoginIp` | IP address |
| **Last Updated** | `profile._meta.lastupdated` | `users.updatedAt` | Timestamp |
| **Email Messages** | `profile._meta.email_messages` | `users.emailMessages` | Boolean converted to '1'/'0' |
| **CRB** | `profile._meta.crb` | `user_profiles.crbNumber` | CRB check number |
| **VON** | `profile._meta.von` | `user_profiles.vonNumber` | VON number |
| **Tour** | `profile._meta.tour` | `user_profiles.tourNumber` | Tour number |

## Critical Data Processing Notes

### HTML Entity Decoding
The following fields have HTML entities decoded both in the API and frontend:
- `first_name` (user_profiles.firstName)
- `last_name` (user_profiles.lastName) 
- `about` (user_profiles.about) - **CRITICAL FOR FULL ABOUT FIELD**
- `shortabout` (user_profiles.shortAbout)
- `rates1` (user_profiles.rateTier1) - Converts &pound; to £
- `rates2` (user_profiles.rateTier2) - Converts &pound; to £
- `rates3` (user_profiles.rateTier3) - Converts &pound; to £

### Boolean Conversions
All boolean fields are converted to '1'/'0' strings for frontend compatibility:
- `verified` (studios.isVerified)
- `featured` (user_profiles.isFeatured)
- All `show*` fields (showEmail, showPhone, etc.)
- All connection fields (connection1-12)
- Rate display settings

### Status Field
- Database stores: `studios.status` as string ("ACTIVE", "INACTIVE")
- API returns: `status.toLowerCase()` ("active", "inactive")
- Frontend expects: String comparison `studio.status === 'active'`

## API Endpoint Structure

The Advanced Studio Editor fetches data from:
- **GET** `/api/admin/studios/[id]` - Returns complete studio profile
- **PUT** `/api/admin/studios/[id]` - Updates studio profile
- **GET** `/api/admin/studios/[id]/images` - Returns studio images

## Data Structure Returned

```javascript
{
  profile: {
    // Basic fields (not in _meta)
    id: string,
    username: string,
    display_name: string,
    email: string,
    status: string,
    joined: Date,
    
    // All other fields in _meta object
    _meta: {
      first_name: string,
      last_name: string,
      about: string, // HTML entities decoded
      shortabout: string, // HTML entities decoded
      rates1: string, // HTML entities decoded (£80)
      rates2: string, // HTML entities decoded (£100)
      rates3: string, // HTML entities decoded (£125)
      // ... all other fields
    }
  }
}
```

## Important Warnings & Solutions

### 1. **Full About Field Issue** ⚠️ **CRITICAL**
**Problem**: The `about` field only shows the first line instead of the complete multi-line description.

**Root Cause**: HTML entities in the database are not being decoded properly.

**Solution**: Apply `decodeHtmlEntities()` function to `user_profiles.about` in your API:

```javascript
function decodeHtmlEntities(str) {
  if (!str) return str;
  
  const htmlEntities = {
    '&pound;': '£',
    '&euro;': '€',
    '&dollar;': '$',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&ndash;': '–',
    '&hellip;': '…'
  };
  
  return str.replace(/&[a-zA-Z0-9#]+;/g, (entity) => {
    return htmlEntities[entity] || entity;
  });
}

// Apply to about field in your API response
profile._meta.about = decodeHtmlEntities(userProfile.about);
```

### 2. **Rate Display Issue** ⚠️ **CRITICAL**
**Problem**: Rate fields show `&pound;80` instead of `£80`.

**Solution**: Apply the same `decodeHtmlEntities()` function to rate fields:

```javascript
profile._meta.rates1 = decodeHtmlEntities(userProfile.rateTier1);
profile._meta.rates2 = decodeHtmlEntities(userProfile.rateTier2);
profile._meta.rates3 = decodeHtmlEntities(userProfile.rateTier3);
```

### 3. **Status Display Issue** ⚠️ **CRITICAL**
**Problem**: Admin dashboard shows all studios as "inactive" when they should be "active".

**Root Cause**: Frontend checks `studio.status === 1` (numeric) but API returns `"active"` (string).

**Solution**: Update frontend status check:

```javascript
// WRONG ❌
studio.status === 1

// CORRECT ✅
studio.status === 'active'
```

### 4. **Website URL Issue**
**Problem**: Website URL field is empty or showing incorrect data.

**Solution**: Map to the correct database field:

```javascript
profile._meta.url = studio.websiteUrl; // From studios table, not user_profiles
```

### 5. **Username vs Display Name Issue**
**Problem**: Username and Display Name show the same value.

**Solution**: Use the correct mapping:

```javascript
profile.username = user.username;        // URL-friendly (e.g., "VoiceoverGuy")
profile.display_name = user.displayName; // Can be removed if not needed
```

## Database Preservation Policy ⚠️

**CRITICAL**: Never modify the database schema or data directly. This database is shared with other projects.

**Always**: Fix issues by changing the API or frontend code only.

## Data Migration Status

✅ **Complete**: All profile data has been migrated from the original CSV files:
- `old-data/users.csv` - Usernames and basic user data
- `old-data/usermeta_extracted.csv` - Profile metadata, rates, connections
- `old-data/profile_flat_edited.csv` - Complete multi-line about descriptions

✅ **About Field Migration**: All 529+ profiles now have complete multi-line about descriptions with HTML entities properly decoded.

## Testing Your Implementation

After implementing the above fixes, verify:

1. **Full About Field**: Check that VoiceoverGuy's profile shows the complete description starting with "A broadcast quality studio for hire in West Yorkshire in the UK..." (not just the first line)

2. **Rate Fields**: Check that rates show `£80`, `£100`, `£125` (not `&pound;80`, etc.)

3. **Status Field**: Check that active studios show as "Active" in the admin dashboard

4. **Website URLs**: Check that VoiceoverGuy's profile shows "https://www.voiceoverguy.co.uk"
