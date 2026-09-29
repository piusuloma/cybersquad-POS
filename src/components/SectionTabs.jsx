import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// One admin section showing several related screens as tabs. Tabs render only when opened,
// so each screen loads its data on first visit rather than all at once.
export function SectionTabs({ tabs, value, onValueChange }) {
	const visible = tabs.filter((tab) => tab.show !== false);
	return (
		<Tabs value={value} onValueChange={onValueChange} className="space-y-4">
			<TabsList className="flex flex-wrap h-auto justify-start gap-1">
				{visible.map((tab) => (
					<TabsTrigger key={tab.value} value={tab.value}>
						{tab.label}
					</TabsTrigger>
				))}
			</TabsList>
			{visible.map((tab) => (
				<TabsContent key={tab.value} value={tab.value}>
					{tab.content}
				</TabsContent>
			))}
		</Tabs>
	);
}
