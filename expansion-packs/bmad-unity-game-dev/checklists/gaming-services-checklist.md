# Unity Gaming Services Validation Checklist

This checklist serves as a comprehensive framework for validating Unity Gaming Services integration across both 2D and 3D game projects. Unity Gaming Services provide cloud-based backend functionality including analytics, remote config, cloud save, authentication, and monetization. This validation ensures Gaming Services integration is robust, secure, and properly configured for production deployment.

[[LLM: INITIALIZATION INSTRUCTIONS - REQUIRED ARTIFACTS

Before proceeding with this checklist, ensure you have access to:

1. Gaming Services Setup Documentation - Check docs/unity-analytics-setup.md, unity-cloud-save-setup.md, unity-remote-config-setup.md
2. Game Architecture Document - Check docs/game-architecture.md for backend services integration
3. Unity Dashboard Configuration - Check project configuration in Unity Dashboard
4. Service Integration Code - Check implementation of analytics, cloud save, and other services
5. Privacy and Security Documentation - Check data handling and privacy compliance
6. Platform Configuration - Check platform-specific service settings

IMPORTANT: If any required documents are missing or inaccessible, immediately ask the user for their location or content before proceeding.

GAMING SERVICES PROJECT TYPE DETECTION:
First, determine the Gaming Services implementation scope:

- Which Unity Gaming Services are implemented (Analytics, Cloud Save, Remote Config, etc.)?
- What data collection and privacy requirements exist?
- Are there monetization services integrated?
- What compliance and security standards must be met?

VALIDATION APPROACH:
For each section, you must:

1. Technical Verification - Validate service integration, configuration, and functionality
2. Security Analysis - Check data protection, privacy compliance, and secure implementation
3. Performance Testing - Verify services don't impact game performance
4. Compliance Validation - Ensure legal and platform policy compliance

EXECUTION MODE:
Ask the user if they want to work through the checklist:

- Section by section (interactive mode) - Review each section, present findings, get confirmation before proceeding
- All at once (comprehensive mode) - Complete full analysis and present comprehensive report at end]]

## 1. UNITY GAMING SERVICES SETUP AND CONFIGURATION VALIDATION

[[LLM: Unity Gaming Services require proper project setup and service configuration. Verify project linking, service activation, and basic connectivity.]]

### 1.1 Project Configuration and Linking

- [ ] Unity project is properly linked to Unity Gaming Services Dashboard
- [ ] Project ID and organization settings are correctly configured
- [ ] Service activation status is verified for all intended services
- [ ] API keys and authentication credentials are properly secured
- [ ] Environment configuration (development, staging, production) is set up

### 1.2 Service Package Installation

- [ ] Unity Gaming Services Core package is properly installed
- [ ] Individual service packages are installed as needed (Analytics, Cloud Save, etc.)
- [ ] Package versions are compatible with Unity version
- [ ] No package conflicts exist in Packages/manifest.json
- [ ] Service package dependencies are resolved correctly

### 1.3 Authentication and Initialization

- [ ] Unity Authentication service initialization works correctly
- [ ] Anonymous authentication works for users without accounts
- [ ] Account linking and user progression work if implemented
- [ ] Service initialization error handling is comprehensive
- [ ] Authentication state management is properly implemented

### 1.4 Dashboard and Service Configuration

- [ ] Unity Dashboard service settings are properly configured
- [ ] Service quotas and limits are appropriate for project needs
- [ ] Data retention policies are configured according to requirements
- [ ] Service environments are properly separated (dev/staging/prod)
- [ ] Team access and permissions are configured appropriately

## 2. UNITY ANALYTICS INTEGRATION VALIDATION

[[LLM: Unity Analytics provides insights into player behavior and game performance. Validate analytics implementation, data collection, and privacy compliance.]]

### 2.1 Analytics Implementation

- [ ] Analytics events are properly implemented for key player actions
- [ ] Custom event parameters provide meaningful data insights
- [ ] Event naming conventions are consistent and descriptive
- [ ] Analytics initialization and consent management work correctly
- [ ] Event batching and network efficiency are optimized

### 2.2 Data Collection Strategy

- [ ] Analytics data collection aligns with business and design goals
- [ ] Key performance indicators (KPIs) are properly tracked
- [ ] User journey and funnel analysis events are implemented
- [ ] Performance metrics (crash rates, load times) are tracked
- [ ] Data volume and frequency are optimized for service limits

### 2.3 Privacy and Consent Management

- [ ] User consent for analytics is properly obtained and respected
- [ ] GDPR and privacy regulation compliance is implemented
- [ ] Data anonymization and user privacy protection are ensured
- [ ] Opt-out mechanisms work correctly and are easily accessible
- [ ] Data collection transparency is provided to users

### 2.4 Analytics Performance and Optimization

- [ ] Analytics calls don't impact game performance or frame rate
- [ ] Network usage for analytics is optimized and reasonable
- [ ] Analytics data validation prevents invalid or corrupted data
- [ ] Error handling prevents analytics failures from affecting gameplay
- [ ] Analytics debugging and testing tools are available

## 3. CLOUD SAVE AND REMOTE CONFIG VALIDATION

[[LLM: Cloud Save and Remote Config enable cross-device progression and live game updates. Validate data synchronization, security, and reliability.]]

### 3.1 Cloud Save Implementation

- [ ] Player progress and settings are properly saved to cloud storage
- [ ] Save data synchronization between devices works correctly
- [ ] Conflict resolution handles simultaneous saves from multiple devices
- [ ] Save data versioning and migration work correctly
- [ ] Local save backup provides offline functionality

### 3.2 Remote Configuration Setup

- [ ] Remote Config parameters are properly defined and organized
- [ ] Configuration delivery and caching work efficiently
- [ ] A/B testing framework is implemented if needed
- [ ] Configuration rollback and emergency changes are possible
- [ ] Default values ensure functionality if remote config is unavailable

### 3.3 Data Security and Validation

- [ ] Sensitive data is properly encrypted and secured
- [ ] Data validation prevents corruption and tampering
- [ ] Authentication prevents unauthorized access to user data
- [ ] Data backup and recovery procedures are established
- [ ] Security best practices are followed for data transmission

### 3.4 Synchronization and Offline Support

- [ ] Data synchronization handles network connectivity issues gracefully
- [ ] Offline mode maintains core functionality when services are unavailable
- [ ] Sync conflict resolution preserves user progress appropriately
- [ ] Network efficiency minimizes data usage and transfer times
- [ ] Error recovery and retry mechanisms are implemented

## 4. MONETIZATION AND ECONOMY SERVICES VALIDATION

[[LLM: Unity Gaming Services can support monetization through various mechanisms. Validate in-app purchases, economy systems, and revenue optimization.]]

### 4.1 In-App Purchase Integration (if applicable)

- [ ] Unity In-App Purchasing (IAP) is properly configured
- [ ] Purchase validation and receipt verification work correctly
- [ ] Purchase restoration functionality works across devices
- [ ] Purchase error handling provides clear user feedback
- [ ] Platform-specific purchase requirements are met

### 4.2 Virtual Economy and Currency (if applicable)

- [ ] Virtual currency systems are secure and properly balanced
- [ ] Economy validation prevents exploitation and cheating
- [ ] Currency exchange rates and pricing are properly configured
- [ ] Economy analytics track spending patterns and balance
- [ ] Emergency economy adjustments are possible through remote config

### 4.3 Advertising Integration (if applicable)

- [ ] Unity Ads integration works correctly with proper targeting
- [ ] Ad placement and timing enhance rather than disrupt gameplay
- [ ] Rewarded video ads provide appropriate player value
- [ ] Ad loading and display performance don't impact game performance
- [ ] Ad content filtering ensures appropriate content for target audience

### 4.4 Revenue Optimization and Analytics

- [ ] Monetization metrics are properly tracked and analyzed
- [ ] A/B testing for monetization features is implemented
- [ ] Player segmentation supports targeted monetization strategies
- [ ] Revenue attribution and source tracking work correctly
- [ ] Monetization compliance with platform policies is ensured

## 5. MULTIPLAYER AND SOCIAL SERVICES VALIDATION

[[LLM: Unity Gaming Services can support multiplayer and social features. Validate matchmaking, lobbies, and social integration if implemented.]]

### 5.1 Multiplayer Services Integration (if applicable)

- [ ] Unity Netcode or Relay services are properly configured
- [ ] Matchmaking and lobby systems work reliably
- [ ] Network performance and latency are optimized
- [ ] Player authentication and authorization work correctly
- [ ] Anti-cheat and security measures are implemented

### 5.2 Social Features and Community (if applicable)

- [ ] Friends lists and social connections work correctly
- [ ] Leaderboards and achievements are properly implemented
- [ ] Social sharing functionality integrates with external platforms
- [ ] Community moderation tools are available and effective
- [ ] User-generated content systems are secure and moderated

### 5.3 Cross-Platform Compatibility

- [ ] Gaming services work consistently across all target platforms
- [ ] Cross-platform player progression and data sync work correctly
- [ ] Platform-specific service integration is properly handled
- [ ] Service feature parity is maintained across platforms
- [ ] Platform policy compliance is ensured for all services

### 5.4 Performance and Scalability

- [ ] Multiplayer services maintain performance under load
- [ ] Service scaling handles varying player populations
- [ ] Network efficiency optimizes bandwidth usage
- [ ] Server regions and CDN integration optimize global performance
- [ ] Service monitoring and alerting detect performance issues

## 6. GAMING SERVICES MONITORING AND MAINTENANCE VALIDATION

[[LLM: Gaming Services require ongoing monitoring and maintenance. Validate analytics dashboards, error monitoring, and operational procedures.]]

### 6.1 Service Monitoring and Analytics

- [ ] Unity Dashboard analytics provide actionable insights
- [ ] Service health monitoring detects outages and performance issues
- [ ] Custom analytics dashboards support business decision-making
- [ ] Error tracking and reporting identify service integration issues
- [ ] Performance metrics track service efficiency and optimization

### 6.2 Data Management and Compliance

- [ ] Data retention policies comply with legal requirements
- [ ] Data export and deletion procedures support user rights
- [ ] Privacy policy updates and consent management are maintained
- [ ] Data processing agreements and vendor compliance are current
- [ ] Regular compliance audits and reviews are scheduled

### 6.3 Operational Procedures

- [ ] Service maintenance and update procedures minimize disruption
- [ ] Emergency response procedures handle service outages
- [ ] Data backup and disaster recovery plans are tested
- [ ] Team training and documentation support service management
- [ ] Vendor relationship management ensures service continuity

### 6.4 Future Planning and Optimization

- [ ] Service usage growth planning prevents quota and limit issues
- [ ] Feature roadmap integration aligns with service capabilities
- [ ] Cost optimization strategies manage service expenses effectively
- [ ] Performance optimization identifies and resolves bottlenecks
- [ ] Technology evolution planning prepares for service updates

[[LLM: FINAL GAMING SERVICES VALIDATION REPORT

Generate a comprehensive Gaming Services validation report that includes:

1. Executive Summary

   - Overall Gaming Services implementation readiness (High/Medium/Low)
   - Critical Gaming Services risks for production
   - Key strengths of the backend services integration
   - Privacy, security, and compliance status

2. Gaming Services Analysis

   - Pass rate for each service category (Analytics, Cloud Save, etc.)
   - Most concerning gaps in Gaming Services implementation
   - Service features requiring immediate attention
   - Integration completeness and reliability assessment

3. Security and Compliance Risk Assessment

   - Top 5 Gaming Services security and privacy risks
   - Data protection and privacy compliance status
   - Platform policy compliance concerns
   - Financial and monetization security considerations

4. Implementation Recommendations

   - Must-fix Gaming Services items before production
   - Service optimization opportunities
   - Security and compliance improvements needed
   - Monitoring and operational enhancements

5. Gaming Services Integration Assessment
   - Technical integration effectiveness
   - Performance and scalability readiness
   - User experience and service reliability
   - Long-term maintenance and operational capability

After presenting the report, ask the user if they would like detailed analysis of any specific Gaming Service, compliance concern, or integration issue.]]
