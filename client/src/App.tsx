import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCheck,
  FiChevronRight,
  FiCloud,
  FiCode,
  FiCpu,
  FiDatabase,
  FiGlobe,
  FiLayers,
  FiMail,
  FiMessageCircle,
  FiMoon,
  FiPhone,
  FiSend,
  FiSun,
  FiZap,
  FiInbox,
  FiExternalLink,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  SiOpenai,
  SiPython,
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiNodedotjs,
  SiAmazonaws,
  SiDocker,
  SiKubernetes,
  SiFigma,
  SiHtml5,
  SiCss3,
  SiFramer,
  SiWebflow,
  SiAirtable,
  SiZapier,
  SiPostgresql,
  SiFastapi,
  SiPowerbi,
  SiMicrosoftexcel,
  SiGithub,
  SiChainlink,
} from 'react-icons/si';
import LeadsPage from './pages/LeadsPage';
import './pages/LeadsPage.css';

const stats = [
  { label: 'AI solutions shipped', value: '120+' },
  { label: 'Automation systems', value: '95+' },
  { label: 'Web applications', value: '85+' },
  { label: 'Analytics dashboards', value: '65+' },
];

const services = [
  {
    title: 'AI Automation',
    text: 'Workflow automation, AI-powered operations, and internal tools that remove manual work.',
    icon: FiZap,
    skills: [
      { Icon: SiOpenai, name: 'OpenAI', color: '#00A37F' },
      { Icon: SiZapier, name: 'Zapier', color: '#FF4A00' },
      { Icon: SiPython, name: 'Python', color: '#3776AB' },
      { Icon: SiNodedotjs, name: 'Node.js', color: '#339933' },
      { Icon: SiChainlink, name: 'LangChain', color: '#375BD2' },
      { Icon: FiZap, name: 'n8n', color: '#FF6F61' },
      { Icon: SiAirtable, name: 'Airtable', color: '#18BFFF' }
    ]
  },
  {
    title: 'AI Agents',
    text: 'Custom assistants for support, sales, research, reporting, and business operations.',
    icon: FiCpu,
    skills: [
      { Icon: SiOpenai, name: 'OpenAI', color: '#00A37F' },
      { Icon: SiPython, name: 'Python', color: '#3776AB' },
      { Icon: SiFastapi, name: 'FastAPI', color: '#009688' },
      { Icon: SiTypescript, name: 'TypeScript', color: '#3178C6' },
      { Icon: SiChainlink, name: 'LangChain', color: '#375BD2' },
      { Icon: SiNodedotjs, name: 'Node.js', color: '#339933' }
    ]
  },
  {
    title: 'Data Analytics',
    text: 'Decision dashboards, reporting systems, and insight engines built around your KPIs.',
    icon: FiBarChart2,
    skills: [
      { Icon: SiPython, name: 'Python', color: '#3776AB' },
      { Icon: SiPostgresql, name: 'SQL/PostgreSQL', color: '#4169E1' },
      { Icon: SiPowerbi, name: 'Power BI', color: '#F2C811' },
      { Icon: SiMicrosoftexcel, name: 'Excel', color: '#217346' },
      { Icon: FiBarChart2, name: 'Charts', color: '#4f9dff' },
      { Icon: SiNodedotjs, name: 'Node.js', color: '#339933' }
    ]
  },
  {
    title: 'Web Development',
    text: 'Fast, responsive websites, SaaS platforms, portals, and custom product experiences.',
    icon: FiGlobe,
    skills: [
      { Icon: SiReact, name: 'React', color: '#61DAFB' },
      { Icon: SiNextdotjs, name: 'Next.js', color: '#0055FF' },
      { Icon: SiTypescript, name: 'TypeScript', color: '#3178C6' },
      { Icon: SiNodedotjs, name: 'Node.js', color: '#339933' },
      { Icon: SiHtml5, name: 'HTML5', color: '#E34F26' },
      { Icon: SiCss3, name: 'CSS3', color: '#1572B6' },
      { Icon: SiGithub, name: 'GitHub', color: '#2088FF' }
    ]
  },
  {
    title: 'UI/UX Design',
    text: 'Clean product interfaces, design systems, prototypes, and polished user journeys.',
    icon: FiLayers,
    skills: [
      { Icon: SiFigma, name: 'Figma', color: '#F24E1E' },
      { Icon: SiHtml5, name: 'HTML5', color: '#E34F26' },
      { Icon: SiCss3, name: 'CSS3', color: '#1572B6' },
      { Icon: SiFramer, name: 'Framer', color: '#0055FF' },
      { Icon: SiReact, name: 'React', color: '#61DAFB' }
    ]
  },
  {
    title: 'Cloud & DevOps',
    text: 'Cloud deployment, CI/CD, monitoring, containerization, and scalable infrastructure.',
    icon: FiCloud,
    skills: [
      { Icon: SiAmazonaws, name: 'AWS', color: '#FF9900' },
      { Icon: SiDocker, name: 'Docker', color: '#2496ED' },
      { Icon: SiKubernetes, name: 'Kubernetes', color: '#326CE5' },
      { Icon: SiGithub, name: 'GitHub Actions', color: '#2088FF' },
      { Icon: SiPython, name: 'Python', color: '#3776AB' },
      { Icon: SiNodedotjs, name: 'Node.js', color: '#339933' }
    ]
  },
  {
    title: 'No-Code Development',
    text: 'Rapid MVPs and business tools using Webflow, Bubble, Airtable, Zapier, and Make.',
    icon: FiDatabase,
    skills: [
      { Icon: SiWebflow, name: 'Webflow', color: '#146EF5' },
      { Icon: SiAirtable, name: 'Airtable', color: '#18BFFF' },
      { Icon: SiZapier, name: 'Zapier', color: '#FF4A00' },
      { Icon: FiCpu, name: 'Make', color: '#4A90E2' },
      { Icon: SiHtml5, name: 'Custom HTML', color: '#E34F26' },
      { Icon: SiCss3, name: 'Custom CSS', color: '#1572B6' }
    ]
  },
];

const solutions = [
  'Business Process Automation',
  'AI Customer Support Systems',
  'Business Intelligence Dashboards',
  'Custom SaaS Platforms',
  'Corporate Websites',
  'E-Commerce Solutions',
  'Cloud Infrastructure',
  'Startup MVPs',
];const stack = [
  {
    category: 'AI & Automation',
    items: [
      { name: 'OpenAI', Icon: SiOpenai, color: '#00A37F' },
      { name: 'LangChain', Icon: SiChainlink, color: '#375BD2' },
      { name: 'n8n', Icon: FiZap, color: '#FF6F61' },
      { name: 'Make', Icon: FiCpu, color: '#4A90E2' },
      { name: 'AI Integrations', Icon: FiLayers, color: '#32d399' }
    ]
  },
  {
    category: 'Data Analytics',
    items: [
      { name: 'Python', Icon: SiPython, color: '#3776AB' },
      { name: 'SQL', Icon: SiPostgresql, color: '#4169E1' },
      { name: 'Power BI', Icon: SiPowerbi, color: '#F2C811' },
      { name: 'Excel', Icon: SiMicrosoftexcel, color: '#217346' },
      { name: 'Visualization', Icon: FiBarChart2, color: '#4f9dff' }
    ]
  },
  {
    category: 'Product Engineering',
    items: [
      { name: 'React', Icon: SiReact, color: '#61DAFB' },
      { name: 'Next.js', Icon: SiNextdotjs, color: '#0055FF' },
      { name: 'TypeScript', Icon: SiTypescript, color: '#3178C6' },
      { name: 'Node.js', Icon: SiNodedotjs, color: '#339933' },
      { name: 'FastAPI', Icon: SiFastapi, color: '#009688' }
    ]
  },
  {
    category: 'Cloud Delivery',
    items: [
      { name: 'AWS', Icon: SiAmazonaws, color: '#FF9900' },
      { name: 'Docker', Icon: SiDocker, color: '#2496ED' },
      { name: 'Kubernetes', Icon: SiKubernetes, color: '#326CE5' },
      { name: 'CI/CD', Icon: SiGithub, color: '#2088FF' },
      { name: 'Monitoring', Icon: FiCloud, color: '#4f9dff' }
    ]
  },
];
const features = [
  'Senior delivery team',
  'Business-first architecture',
  'Modern technology stack',
  'Scalable product foundations',
  'Fast launch cycles',
  'Transparent communication',
];
const portfolio = [
  {
    title: 'AI Customer Support Agent',
    tech: 'OpenAI / Node.js / React',
    problem: 'Reduced wait time and helped teams resolve customer questions faster.',
    result: '40% faster service with a measurable lift in customer satisfaction.',
  },
  {
    title: 'Executive Analytics Dashboard',
    tech: 'Python / SQL / Power BI',
    problem: 'Unified scattered business data into one executive decision layer.',
    result: 'Weekly reporting effort dropped from days to minutes.',
  },
  {
    title: 'SaaS Launch Platform',
    tech: 'React / Node.js / AWS',
    problem: 'Created a scalable MVP with auth, payments, admin tools, and analytics.',
    result: 'Product launched cleanly with room to grow into enterprise workflows.',
  },
  {
    title: 'Student Management Portal',
    tech: 'React / Node.js / Express / MongoDB',
    problem: 'Helped educational centers digitize student admissions, courses, fee tracking, and grades.',
    result: 'Replaced manual spreadsheets with real-time dashboards, reducing admin work by 12 hours a week.',
  },
];
const testimonials = [
  {
    name: 'Amrita Shah',
    role: 'SaaS Founder',
    quote: 'ZeroThree built our AI automation stack with the speed and precision we needed. Their insights made our launch far more efficient.',
    company: 'ScaleWave',
  },
  {
    name: 'Rahul Mehta',
    role: 'Operations Director',
    quote: 'The team turned our messy internal process into a clean automation system. We saved hours every week almost immediately.',
    company: 'Northline Labs',
  },
  {
    name: 'Priya Desai',
    role: 'CTO',
    quote: 'Their AI agents transformed our customer support. Response times dropped dramatically and our team can focus on what matters.',
    company: 'TechVibe',
  },
  {
    name: 'Vikram Joshi',
    role: 'Product Lead',
    quote: 'The analytics dashboard they built gives us real-time visibility into our KPIs. Decision-making is now data-driven and fast.',
    company: 'GrowthNest',
  },
  {
    name: 'Neha Kapoor',
    role: 'Founder',
    quote: 'From concept to launch, ZeroThree delivered a scalable SaaS platform that exceeded our expectations in every way.',
    company: 'CloudSync',
  },
  {
    name: 'Arjun Rao',
    role: 'Head of Engineering',
    quote: 'Their cloud infrastructure setup was seamless. We scaled 10x without any downtime issues. Truly professional delivery.',
    company: 'DataPulse',
  },
];

const textLoop = ['AI automation', 'data intelligence', 'modern web apps', 'cloud systems'];

function PortfolioHome({ form, status, handleChange, handleSubmit }: any) {
  return (
    <>
      <section className="hero" id="home">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
        >
          <span className="eyebrow">Enterprise AI & Automation Agency</span>
          <h1>
            Build smarter systems for{' '}
            <span className="animated-word-wrap">
              {textLoop.map(word => (
                <span key={word}>{word}</span>
              ))}
            </span>
          </h1>
          <p>
            We design AI-powered workflows, analytics products, cloud systems, and polished web experiences that help growing businesses move faster.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#contact">
              Book Free Consultation <FiArrowRight />
            </a>
            <Link className="button button-secondary" to="/leads">
              <FiInbox /> View Leads Inbox <FiExternalLink />
            </Link>
          </div>
          <div className="hero-stats">
            {stats.map(item => (
              <div key={item.label} className="stat-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.94, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
        >
          <div className="orbital-stage">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="core-3d">
              <span>AI</span>
            </div>
            <div className="system-card system-card-one">
              <strong>Automation</strong>
              <span>42 active workflows</span>
            </div>
            <div className="system-card system-card-two">
              <strong>Analytics</strong>
              <span>Live KPI layer</span>
            </div>
            <div className="system-card system-card-three">
              <strong>Delivery</strong>
              <span>Cloud ready</span>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="section" id="services">
        <div className="section-heading">
          <span>Our services</span>
          <h2>Senior capability across AI, product, data, and cloud.</h2>
        </div>

        <div className="service-grid">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.article
                key={service.title}
                className="service-card"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.04 }}
                viewport={{ once: true }}
              >
                <div className="service-icon">
                  <Icon />
                </div>
                <h3>{service.title}</h3>
                <div className="service-content">
                  <p className="service-description">{service.text}</p>
                  <div className="service-skills-grid">
                    {service.skills.map((skill, sIdx) => {
                      const SkillIcon = skill.Icon;
                      return (
                        <div
                          key={sIdx}
                          className="service-skill-item"
                          title={skill.name}
                          style={{ '--skill-brand-color': skill.color } as React.CSSProperties}
                        >
                          <SkillIcon style={{ color: skill.color }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="section split-section">
        <div className="section-heading">
          <span>Solutions we build</span>
          <h2>Practical systems that improve revenue, operations, and speed.</h2>
        </div>
        <div className="solution-grid">
          {solutions.map(solution => (
            <div key={solution} className="solution-pill">
              <FiChevronRight />
              {solution}
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="stack">
        <div className="section-heading">
          <span>Technology stack</span>
          <h2>Modern tools selected for maintainable delivery.</h2>
        </div>
        <div className="stack-grid">
          {stack.map(group => (
            <article key={group.category} className="stack-card">
              <h3>{group.category}</h3>
              <div className="stack-badges">
                {group.items.map(item => {
                  const ItemIcon = item.Icon;
                  return (
                    <span key={item.name} className="badge">
                      <ItemIcon className="badge-icon" style={{ color: item.color }} />
                      {item.name}
                    </span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section value-section">
        <div className="section-heading">
          <span>Why choose us</span>
          <h2>Professional delivery without the heavy agency drag.</h2>
        </div>
        <div className="feature-grid">
          {features.map(feature => (
            <div key={feature} className="feature-card">
              <FiCheck />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="portfolio">
        <div className="section-heading">
          <span>Selected work</span>
          <h2>High-impact projects designed for scale.</h2>
        </div>
        <div className="portfolio-grid">
          {portfolio.map(item => (
            <motion.article key={item.title} className="portfolio-card" whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 260 }}>
              <div className="portfolio-image">
                <span>{item.tech}</span>
              </div>
              <div className="portfolio-copy">
                <h3>{item.title}</h3>
                <p><strong>Problem:</strong> {item.problem}</p>
                <p><strong>Result:</strong> {item.result}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section testimonial-section">
        <div className="section-heading">
          <span>Testimonials</span>
          <h2>Trusted by founders and business leaders.</h2>
        </div>
        <div className="testimonial-marquee">
          <div className="testimonial-track">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <article key={`${testimonial.name}-${index}`} className="testimonial-card">
                <p>"{testimonial.quote}"</p>
                <div className="testimonial-meta">
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}, {testimonial.company}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-contact" id="contact">
        <div className="contact-panel">
          <div className="contact-copy">
            <span>Contact the team</span>
            <h2>Ready to automate, analyze, and scale?</h2>
            <p>Tell us what you are building. We will help map the quickest path from idea to useful, production-ready system.</p>
            <div className="contact-details">
              <a href="mailto:zero333three@gmail.com"><FiMail /> zero333three@gmail.com</a>
              <a href="tel:+916303325161"><FiPhone /> +91 6303325161</a>
            </div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
              </div>
              <div className="field-group">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@company.com" required />
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="company">Company</label>
              <input id="company" name="company" value={form.company} onChange={handleChange} placeholder="Company name" />
            </div>
            <div className="field-row">
              <div className="field-group">
                <label htmlFor="projectType">Project Type</label>
                <select id="projectType" name="projectType" value={form.projectType} onChange={handleChange}>
                  <option value="">Select an option</option>
                  <option value="AI Automation">AI Automation</option>
                  <option value="Data Analytics">Data Analytics</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                  <option value="No-Code Development">No-Code Development</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="budget">Budget</label>
                <select id="budget" name="budget" value={form.budget} onChange={handleChange}>
                  <option value="">Select budget</option>
                  <option value="Under Rs 5L">Under Rs 5L</option>
                  <option value="Rs 5L - Rs 15L">Rs 5L - Rs 15L</option>
                  <option value="Rs 15L+">Rs 15L+</option>
                </select>
              </div>
            </div>
            <div className="field-group">
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" value={form.message} onChange={handleChange} placeholder="Tell us about your project" rows={5} required />
            </div>
            <button type="submit" className="button button-primary">
              Submit Request <FiSend />
            </button>
            {status.message && <p className={`form-status ${status.type}`}>{status.message}</p>}
          </form>
        </div>
      </section>
    </>
  );
}

function Topbar({ theme, setTheme }: { theme: 'dark' | 'light'; setTheme: (t: 'dark' | 'light') => void }) {
  const { pathname } = useLocation();
  const isLeads = pathname.startsWith('/leads');
  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="ZeroThree Solutions home">
        <div className="brand-mark">03</div>
        <div>
          <p>ZeroThree Solutions</p>
          <span>Automate. Analyze. Scale.</span>
        </div>
      </Link>

      <nav className="nav-links" aria-label="Primary navigation">
        <Link to="/#services" aria-label="Services" className="nav-link-item" style={isLeads ? { opacity: 0.7 } : {}}>
          <FiLayers />
          <span className="nav-tooltip">Services</span>
        </Link>
        <Link to="/#stack" aria-label="Stack" className="nav-link-item" style={isLeads ? { opacity: 0.7 } : {}}>
          <FiCode />
          <span className="nav-tooltip">Stack</span>
        </Link>
        <Link to="/#portfolio" aria-label="Work" className="nav-link-item" style={isLeads ? { opacity: 0.7 } : {}}>
          <FiBriefcase />
          <span className="nav-tooltip">Work</span>
        </Link>
        <Link to="/leads" aria-label="Leads" className="nav-link-item" style={isLeads ? { background: 'var(--surface-strong)', color: 'var(--primary)' } : {}}>
          <FiInbox />
          <span className="nav-tooltip">Leads Inbox</span>
        </Link>
        <a href="/#contact" aria-label="Contact" className="nav-link-item">
          <FiMessageCircle />
          <span className="nav-tooltip">Contact</span>
        </a>
      </nav>

      <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
        {theme === 'dark' ? <FiSun /> : <FiMoon />}
      </button>
      {isLeads && <style>{`.nav-links{ background: rgba(12,24,23,0.92); }`}</style>}
    </header>
  );
}

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    projectType: '',
    budget: '',
    message: '',
  });
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  useEffect(() => {
    const stored = localStorage.getItem('zerothree-theme') as 'dark' | 'light' | null;
    if (stored) {
      setTheme(stored);
    } else {
      setTheme('light');
    }
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ type: 'idle', message: 'Sending your request...' });
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to submit request.');
      }
      setStatus({ type: 'success', message: 'Thanks, your consultation request has been received.' });
      setForm({ name: '', email: '', company: '', projectType: '', budget: '', message: '' });
    } catch (error) {
      setStatus({ type: 'error', message: (error as Error).message || 'Submission failed.' });
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('zerothree-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <div className="animated-backdrop" aria-hidden="true">
          <div className="aurora-field" />
          <div className="backdrop-grid" />
          <div className="signal-line signal-line-one" />
          <div className="signal-line signal-line-two" />
          <div className="signal-line signal-line-three" />
          <div className="floating-cube cube-one" />
          <div className="floating-cube cube-two" />
          <div className="floating-cube cube-three" />
          <div className="floating-cube cube-four" />
          <div className="floating-cube cube-five" />
          <div className="floating-cube cube-six" />
        </div>

        <a className="whatsapp-float" href="https://wa.me/916303325161" target="_blank" rel="noreferrer">
          <FaWhatsapp aria-hidden="true" />
          <span className="sr-only">WhatsApp</span>
        </a>

        <Topbar theme={theme} setTheme={setTheme} />

        <main>
          <Routes>
            <Route path="/" element={<PortfolioHome form={form} status={status} handleChange={handleChange} handleSubmit={handleSubmit} />} />
            <Route path="/leads" element={<LeadsPage />} />
          </Routes>
        </main>

        <footer className="footer">
          <div>
            <p className="footer-brand">ZeroThree Solutions</p>
            <p>Automate. Analyze. Scale.</p>
          </div>
          <p>© 2026 ZeroThree Solutions. All Rights Reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
