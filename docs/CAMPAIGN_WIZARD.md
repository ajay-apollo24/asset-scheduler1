# Campaign Creation Wizard

## Overview

The Campaign Creation Wizard is a multi-step form that breaks down the lengthy campaign creation process into logical, manageable steps. This provides a better user experience compared to the previous single-page form.

## Features

### Multi-Step Navigation

- **Step 1: Basic Information** - Campaign name and advertiser selection
- **Step 2: Budget & Schedule** - Budget, dates, and status
- **Step 3: Goals & Pricing** - Campaign goals and pricing model
- **Step 4: Targeting** - Audience targeting criteria (optional)
- **Step 5: Review & Create** - Final review and campaign creation

### User Experience Improvements

1. **Visual Progress Indicator**
   - Clear step-by-step progress bar
   - Current step highlighting
   - Completed step checkmarks

2. **Validation**
   - Real-time field validation
   - Step-specific required field checking
   - Disabled navigation until requirements are met

3. **Responsive Design**
   - Works on desktop and mobile devices
   - Clean, modern UI with proper spacing

4. **Navigation**
   - Previous/Next buttons for step navigation
   - Cancel button to return to campaigns list
   - Breadcrumb navigation with back button

## Usage

### Standalone Page

Navigate to `/ad-server/campaigns/create` for a full-page campaign creation experience.

### Modal Integration

The wizard can also be used within a modal for quick campaign creation.

## Components

### CampaignWizard

Main wizard component that handles:

- Step navigation
- Form state management
- Validation
- API calls

### CreateCampaign

Standalone page component that wraps the wizard with:

- Page layout
- Navigation header
- Permission checking

## Form Fields

### Step 1: Basic Information

- **Campaign Name** (required)
- **Advertiser** (required, auto-filled for non-admin users)

### Step 2: Budget & Schedule

- **Budget** (required)
- **Status** (draft/active/paused/completed)
- **Start Date** (required)
- **End Date** (required)

### Step 3: Goals & Pricing

- **Goal Type** (required: impressions/clicks/conversions/spend)
- **Goal Value** (required)
- **Pacing** (even/asap/custom)
- **Pricing Model** (cpm/cpc/cpa/flat)
- **Frequency Cap** (optional)
- **Day Parting** (optional JSON)

### Step 4: Targeting

- **Demographics**: Age, Gender, Interests
- **Geographic**: Countries, Cities
- **Device Types**: Desktop, Mobile, Tablet

### Step 5: Review

- Summary of all entered information
- Final confirmation before creation

## API Integration

The wizard uses the same API endpoints as the original form:

- `POST /ad-server/campaigns` - Create new campaign
- `PUT /ad-server/campaigns/:id` - Update existing campaign
- `GET /users` - Fetch advertisers (admin only)

## Permissions

- **campaign:create** - Required to access the wizard
- **Platform Admin** - Can select advertisers, otherwise auto-filled with user ID

## Testing

Run the test suite:

```bash
npm test CampaignWizard.test.js
```

## Future Enhancements

1. **Draft Saving** - Save progress and resume later
2. **Template Support** - Pre-filled templates for common campaign types
3. **Advanced Targeting** - More sophisticated audience targeting options
4. **Preview Mode** - Preview campaign before creation
5. **Bulk Creation** - Create multiple campaigns from templates

## Migration from Old Form

The original `CampaignForm` component is still available for backward compatibility, but new development should use the `CampaignWizard` for better user experience.

### Breaking Changes

- None - the wizard maintains the same API contract
- Same form data structure
- Same validation rules
- Same permission requirements
