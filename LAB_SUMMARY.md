# F5 XC Design Challenge: Capsule Corporation

<p align="center">
  <img src="capsule-info/images/cc-logo.png" alt="Capsule Corporation" width="200">
</p>

## Welcome, Z-Fighter!

You've been called in to help **Capsule Corporation**—the technology giant behind Hoi-Poi Capsules, flying cars, and time machines—solve their escalating security and infrastructure challenges using F5 Distributed Cloud.

Bulma Brief, CTO, has had enough. The Red Ribbon Army keeps attacking during product launches. The Dragon Radar API is painfully slow for users outside Japan. And her security team spends 23 hours a week just reconciling alerts between their cloud and on-prem WAFs.

Your mission: design and implement an F5 XC solution that protects Capsule Corp's hybrid infrastructure, secures their APIs, stops the attacks, and gets performance under control.

---

## The Lab Environment

This UDF blueprint includes a containerized demo environment with three working applications that simulate Capsule Corp's production workloads:

| Application | What It Does |
|-------------|--------------|
| **Dragon Radar API** | REST API returning Dragon Ball locations—perfect for testing rate limiting, OAS validation, and API security |
| **Capsule Corp Store** | E-commerce site selling Hoi-Poi Capsules—ideal for WAF, bot protection, and PCI compliance testing |
| **Gravity Chamber** | WebSocket service for the training chamber—demonstrates private multi-cloud networking |

The **Scouter** tool validates your F5 XC configuration by running automated security tests against these apps. Configure your protections correctly, and you'll achieve a power level over 9000.

---

## Getting Started

1. **Access the Portal** — Open `http://<jumphost>:8080` in your browser

2. **Review the Challenge** — The Challenge page has everything: company background, infrastructure details, recent incidents, and design objectives

3. **Explore the Apps** — The Demo Apps page documents all endpoints and test scenarios

4. **Design Your Solution** — Use F5 XC to address the five design objectives

5. **Validate with Scouter** — Run the security tests to verify your configuration works

---

## Quick Links

Once your environment is running:

- **Portal**: `http://<jumphost>:8080`
- **Dragon Radar API**: `http://<jumphost>:3001/api-docs`
- **Capsule Store**: `http://<jumphost>:3000`
- **Gravity Chamber**: `ws://<jumphost>:3003/chamber`

---

## Pro Tips

- The Dragon Radar API includes an OpenAPI spec—download it from the Demo Apps page and upload it to F5 XC for API Discovery
- Test credentials for the store: `goku` / `kamehameha` (or `bulma` / `capsule123` if you prefer)
- The Gravity Chamber should only be accessible via private networking—if it resolves to a public IP, you've got work to do
- Click the ⓘ icons in Scouter to see exactly what each test does

Good luck. Bulma is counting on you.

*"The power level... it's over 9000!"*
