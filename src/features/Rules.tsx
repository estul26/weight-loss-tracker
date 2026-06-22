import { Icon, SectionTitle } from '../components/ui'

export function Rules({ onBack }: { onBack: () => void }) {
  const good = ['Eggs', 'Meat', 'Fish', 'Chicken', 'Beef', 'Lamb', 'Tofu', 'Vegetables', 'Plain Greek yogurt', 'Nuts in small amounts', 'Olive oil', 'Avocado']
  const reduce = ['Sugary drinks', 'Juice', 'Bubble tea', 'Desserts', 'Cookies', 'Cakes', 'White bread', 'Noodles', 'Pasta', 'White rice', 'Potatoes', 'Chips', 'Late-night snacks']
  const rules = ['No sugary drinks', 'No snacks when possible', 'Close the eating window', 'Build meals around protein', 'Add many vegetables', 'Walk daily', 'Track honestly, not perfectly']
  return <>
    <SectionTitle eyebrow="Simple food rules" title="Keep choices uncomplicated." subtitle="A few gentle defaults can make daily decisions much easier." action={<button className="btn-secondary" onClick={onBack}>Back to more</button>} />
    <div className="grid gap-5 md:grid-cols-2"><FoodList title="Foods to lean on" items={good} tone="green" /><FoodList title="Foods to reduce" items={reduce} tone="amber" /></div><section className="rules-card"><div className="flex items-center gap-3"><span className="section-icon dark"><Icon name="rules" className="h-5 w-5" /></span><div><p className="eyebrow text-emerald-100">The main rules</p><h2>Small enough to remember.</h2></div></div><ul>{rules.map((rule) => <li key={rule}>✓ {rule}</li>)}</ul></section>
  </>
}

function FoodList({ title, items, tone }: { title: string; items: string[]; tone: 'green' | 'amber' }) { return <section className={`food-list food-${tone}`}><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section> }
