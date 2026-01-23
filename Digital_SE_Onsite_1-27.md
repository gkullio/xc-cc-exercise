# Scenario

Capsule Corporation, Earth's leading technology conglomerate, operates a global digital platform supporting manufacturing, R&D, and consumer services worldwide.

## Current Infrastructure

- **West City (Seattle) HQ:** On-premises data centers hosting core Hoi-Poi Capsule manufacturing and inventory systems and mobile app backend.
- **AWS (North America):** Customer-facing e-commerce platform and mobile app front end.
- **Azure (Europe):** R&D applications and gravity chamber control systems. Dragon Radar API and real-time vehicle tracking services.

## Critical Challenges

- **DDoS and OWASP Attacks:** Red Ribbon Army remnants launched coordinated attacks during product launches, taking down the capsule ordering system for 4 hours (Ƶ200B loss).
- **Performance Issues:** Dragon Radar API response times: 80ms (Japan) vs 950ms (South America), causing customer complaints.
- **Fragmented Security:** Each cloud platform uses different WAF and security tools; no unified policy enforcement.
- **Compliance Gaps:** Audit identified critical vulnerabilities in payment processing APIs.

## Recent Incidents

- Credential stuffing attack on customer portal exposed capsule purchase history.
- Gravity chamber control API experienced SQL injection attempts (12 blocked, 3 successful).
- Mobile app API gateway overloaded during new capsule car launch (30% request failures).

---

## Objective

Design an F5 Distributed Cloud solution for Capsule Corp. Addressing:

- **Multi-Cloud Architecture:** How would you use F5 XC to unify security and connectivity across AWS, Azure, GCP, and on-premises? Application Front and Back End?
- **API Security:** Which F5 XC services would protect the Dragon Radar API, e-commerce APIs, and gravity chamber control systems?
- **DDoS, WAF & Bot Protection:** How would you defend against sophisticated attacks targeting product launches?
- **Performance Optimization:** How would you improve global API response times and handle traffic spikes?
- **Unified Management:** How would you give Bulma's team centralized visibility and control?
