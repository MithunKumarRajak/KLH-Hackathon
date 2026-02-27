"""
Management command to seed sample recipes for ALL registered users.
Each user gets unique recipes with brands, manufacturers, allergens.
No demo user — recipes are distributed across every real account.
"""
import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from labels.models import Ingredient, Recipe, RecipeIngredient


# ─── Data pools ──────────────────────────────────────────────────────

BRANDS = [
    "Satvika Foods", "NutriBlend India", "Organic Valley", "Annapurna Naturals",
    "Fresh Fields", "Desi Delight", "Pure Harvest", "Green Kitchen Co.",
    "Nature's Basket", "Heritage Foods", "Amul", "Mother Dairy", "Patanjali",
    "Dabur", "ITC Master Chef", "MTR Foods", "Haldiram's", "Bikano",
    "Lijjat Papad Co.", "Everest Masala", "MDH Spices", "Catch Spices",
    "Tata Sampann", "Fortune Foods", "Aashirvaad", "Saffola", "Sundrop",
    "Real Juice Co.", "Paper Boat", "Raw Pressery", "Tropicana India",
    "Nestlé India", "Britannia", "Parle Products", "Priya Foods",
    "Eastern Condiments", "Smith & Jones", "Weikfield", "Dr. Oetker India",
    "Fun Foods", "Kissan", "Maggi India", "Bambino", "Pillsbury India",
    "Del Monte India", "Mapro", "Cremica", "Veeba", "Sil Foods",
    "Nilon's", "Tops", "Swad", "Badshah Masala", "Vasant Masala",
    "Gits Food", "Kohinoor Foods", "Dawaat", "India Gate", "Lal Qilla",
    "Sunfeast", "Bingo!", "Lay's India", "Kurkure", "Too Yumm!",
    "Act II India", "Yoga Bar", "RiteBite Max Protein", "The Whole Truth",
    "Slurrp Farm", "Early Foods", "Timios", "ByGrandma", "Happa Foods",
]

MANUFACTURERS = [
    "Satvika Food Products Pvt. Ltd., Bhopal", "NutriBlend Manufacturing, Hyderabad",
    "Organic Valley Agro, Pune", "Annapurna Foods Ltd., Delhi",
    "Green Kitchen Industries, Mumbai", "Desi Delight Foods, Jaipur",
    "Pure Harvest Organics, Bangalore", "Heritage Food Enterprises, Secunderabad",
    "Gujarat Cooperative Milk Marketing Federation, Anand",
    "Mother Dairy Fruit & Vegetable, Delhi", "Patanjali Ayurved Ltd., Haridwar",
    "Dabur India Ltd., Ghaziabad", "ITC Limited, Kolkata",
    "MTR Foods Pvt. Ltd., Bangalore", "Haldiram Manufacturing Co., Nagpur",
    "Bikano Foods Pvt. Ltd., New Delhi", "Tata Consumer Products, Mumbai",
    "Adani Wilmar Ltd., Ahmedabad", "Hindustan Unilever Ltd., Mumbai",
    "Nestlé India Ltd., Gurgaon", "Britannia Industries Ltd., Bangalore",
    "Parle Products Pvt. Ltd., Mumbai", "Priya Foods Pvt. Ltd., Hyderabad",
    "Eastern Condiments Pvt. Ltd., Kochi", "Weikfield Products Co., Pune",
    "Dr. Oetker India Pvt. Ltd., Delhi", "Cremica Food Industries, Ludhiana",
    "Veeba Food Services Pvt. Ltd., Gurgaon", "Mapro Industries, Pune",
    "Capital Foods Pvt. Ltd., Mumbai", "A.D.F. Foods Ltd., Mumbai",
    "Nilon's Enterprises Pvt. Ltd., Jalgaon", "Agro Tech Foods Ltd., Hyderabad",
    "Pagariya Food Products, Jaipur", "Sri Sri Tattva, Bangalore",
    "Organic India Pvt. Ltd., Lucknow", "24 Mantra Organic, Hyderabad",
    "Conscious Food Pvt. Ltd., Mumbai", "Pro Nature Organic Foods, Bangalore",
    "Sresta Natural Bioproducts, Hyderabad", "Phalada Agro Research, Bangalore",
    "PepsiCo India Holdings, Gurgaon", "Marico Ltd., Mumbai",
    "Godrej Industries Ltd., Mumbai", "Emami Agrotech Ltd., Kolkata",
    "Ruchi Soya Industries Ltd., Indore", "Cargill India Pvt. Ltd., Gurgaon",
    "Hershey India Pvt. Ltd., Mumbai", "Ferrero India Pvt. Ltd., Pune",
    "Mars International India Pvt. Ltd., Gurgaon",
    "Mondelez India Foods Pvt. Ltd., Mumbai",
]

ALLERGENS = [
    "Contains: Milk", "Contains: Milk, Soy", "Contains: Wheat, Gluten",
    "Contains: Nuts (Cashew, Almond)", "Contains: Peanuts",
    "Contains: Tree Nuts (Walnut, Pistachio)", "Contains: Wheat, Milk",
    "Contains: Soy, Wheat", "Contains: Milk, Nuts, Gluten",
    "Contains: Sesame", "Contains: Mustard",
    "Contains: Fish", "Contains: Eggs", "Contains: Eggs, Milk",
    "Contains: Wheat, Eggs, Milk", "Contains: Shellfish",
    "Contains: Celery", "Contains: Lupin",
    "Contains: Milk, Sesame, Wheat", "Contains: Peanuts, Tree Nuts",
    "Contains: Soy, Milk, Wheat, Eggs", "Contains: Gluten (Wheat, Barley)",
    "Contains: Coconut, Tree Nuts", "Contains: Mustard, Sesame",
    "May contain traces of nuts", "May contain traces of milk",
    "May contain traces of gluten", "May contain traces of soy",
    "May contain traces of peanuts and tree nuts",
    "May contain traces of eggs and milk",
    "No known allergens", "",
]

# Recipe name templates by category
RECIPE_TEMPLATES = {
    "Snacks & Bars": [
        "{adj} Protein Bar", "{adj} Energy Bar", "{adj} Granola Bar",
        "{base} Chikki", "{base} Ladoo", "{base} Barfi",
        "{adj} Trail Mix", "{base} Namkeen Mix", "{adj} Muesli Bar",
        "{base} Chakli", "{base} Murukku", "{base} Mathri",
        "{adj} Roasted {base}", "Spiced {base} Snack", "{base} Mixture",
        "{adj} Protein Balls", "{base} Crunch Bar", "{adj} Nut Cluster",
        "{base} Bhujia", "{adj} Khakhra", "{base} Sev Puri Mix",
    ],
    "Beverages": [
        "{base} Smoothie", "{adj} Lassi", "{base} Milkshake",
        "{adj} Juice Blend", "{adj} Chai Concentrate", "{base} Sharbat",
        "{adj} Protein Shake", "{base} Buttermilk", "Iced {base} Drink",
        "{adj} Thandai", "{base} Aam Panna", "{adj} Health Drink",
        "Masala {base} Tea", "{adj} Green Smoothie", "Turmeric {base} Latte",
        "{base} Nimbu Pani", "{adj} Jaljeera", "{base} Kanji",
    ],
    "Breakfast Cereals": [
        "{adj} Oats Porridge", "{adj} Muesli", "{base} Upma Mix",
        "{adj} Poha Mix", "{base} Dalia", "Multi-Grain {adj} Cereal",
        "{adj} Cornflakes Plus", "{base} Idli Mix", "{base} Dosa Mix",
        "Instant {base} Porridge", "{adj} Ragi Malt", "{adj} Sattu Mix",
        "Masala {base} Oats", "Savoury {base} Flakes", "Sweet {base} Crunch",
        "{base} Uttapam Mix", "{adj} Pesarattu Mix", "{base} Appam Mix",
    ],
    "Curries & Gravies": [
        "{base} Masala Curry", "{adj} Dal Tadka", "Paneer {base} Masala",
        "{base} Korma", "{adj} Rajma Curry", "Mixed Veg {adj} Gravy",
        "{base} Sambar", "{adj} Chole Masala", "Mushroom {base} Curry",
        "Aloo {base} Sabzi", "{adj} Kadai Paneer", "Bhindi {adj} Masala",
        "Palak {base} Gravy", "{adj} Malai Kofta", "{base} Shahi Paneer",
        "Dum {adj} Aloo", "Matar {base} Paneer", "Baingan {adj} Bharta",
        "{adj} Navratan Korma", "{base} Koottu Curry", "{adj} Aviyal",
    ],
    "Rice & Biryani": [
        "{adj} Vegetable Biryani", "{base} Pulao", "Hyderabadi {adj} Biryani",
        "{base} Khichdi", "{adj} Lemon Rice", "Jeera {base} Rice",
        "Coconut {base} Rice", "{adj} Tomato Rice", "Mushroom {adj} Fried Rice",
        "{base} Pongal", "{adj} Tehri", "Masala {base} Rice Bowl",
        "{adj} Curd Rice", "Bisi Bele {base} Bath", "{adj} Vangi Bath",
    ],
    "Breads & Rotis": [
        "Multi-Grain {adj} Roti", "{base} Paratha", "Stuffed {adj} Naan",
        "{adj} Thepla", "{base} Chapati Mix", "Masala {adj} Puri",
        "{base} Kulcha", "{adj} Bhatura Mix", "Jowar {adj} Roti",
        "Bajra {base} Roti", "Ragi {adj} Roti", "Makki {adj} Roti",
        "{base} Pathiri", "{adj} Lachha Paratha", "{base} Rumali Roti",
    ],
    "Sweets & Desserts": [
        "{base} Kheer", "{adj} Gulab Jamun", "{base} Halwa",
        "{adj} Rasmalai", "{base} Payasam", "Coconut {adj} Laddu",
        "{base} Rabdi", "{adj} Kulfi Mix", "Shahi {base} Tukda",
        "{adj} Phirni", "{base} Sandesh", "Besan {adj} Ladoo",
        "{base} Gajar Halwa", "{adj} Rasgulla", "Kaju {adj} Katli",
        "{base} Mysore Pak", "{adj} Peda", "{base} Modak",
    ],
    "Chutneys & Pickles": [
        "{base} Chutney", "{adj} Pickle", "Mint {base} Sauce",
        "{adj} Tomato Ketchup", "Mango {adj} Pickle", "{base} Thokku",
        "{adj} Coconut Chutney", "Garlic {base} Pickle", "Mixed {adj} Achaar",
        "Tamarind {base} Chutney", "{adj} Amla Pickle", "Green {base} Relish",
        "Lemon {adj} Pickle", "{base} Gongura Pickle", "{adj} Avakaya",
    ],
    "Soups & Broths": [
        "{adj} Tomato Soup", "{base} Rasam", "Mixed Veg {adj} Soup",
        "Cream of {base} Soup", "{adj} Lentil Soup", "Sweet Corn {adj} Soup",
        "{base} Broth", "Shorba {adj} Mix", "{adj} Mulligatawny Soup",
        "Hot & Sour {base} Soup", "{adj} Manchow Soup", "Spinach {base} Soup",
    ],
    "Spreads & Dips": [
        "{base} Peanut Butter", "{adj} Hummus", "{base} Tahini Spread",
        "{adj} Cheese Spread", "{base} Jam", "{adj} Almond Butter",
        "Chocolate {base} Spread", "{adj} Garlic Dip", "{base} Raita Mix",
        "{adj} Muhammara Dip", "{base} Baba Ganoush", "{adj} Mint Raita",
    ],
    "Ready Meals": [
        "Instant {base} Biryani", "{adj} Thali Pack", "Ready-to-Eat {base} Curry",
        "{adj} Meal Bowl", "Quick {base} Pulao Pack", "{adj} Sabzi Combo",
        "Frozen {base} Paratha Pack", "{adj} Meal Kit", "{base} Lunch Box Mix",
        "Heat & Serve {adj} Dal", "Microwave {base} Rice Bowl", "One-Pot {adj} Meals",
    ],
    "Sauces & Marinades": [
        "{adj} Tikka Marinade", "{base} Tandoori Sauce", "Schezwan {adj} Sauce",
        "{base} Curry Paste", "{adj} Green Chutney Sauce", "Peri Peri {base} Sauce",
        "{adj} BBQ Marinade", "Mango {base} Glaze", "{adj} Vinaigrette Dressing",
    ],
    "Baby Food": [
        "{base} Baby Cereal", "{adj} Infant Formula Supplement",
        "Organic {base} Baby Porridge", "{adj} Toddler Snack",
        "{base} First Foods Puree", "Multi-Grain {adj} Baby Mix",
    ],
    "Health & Supplements": [
        "{adj} Whey Protein Mix", "{base} Meal Replacement",
        "Plant-Based {adj} Protein", "{base} Super Greens Powder",
        "{adj} Immunity Booster", "{base} Electrolyte Mix",
        "Pre-Workout {adj} Blend", "{adj} Probiotic Drink Mix",
    ],
    "Frozen Foods": [
        "Frozen {adj} Samosa", "{base} Frozen Tikki", "{adj} Ice Cream",
        "Frozen {base} Momos", "{adj} Frozen Spring Roll", "{base} Frozen Cutlet",
        "Frozen {adj} Kebab Pack", "{base} Frozen Wada", "{adj} Frozen Pakora",
    ],
    "Dairy Products": [
        "{adj} Paneer Block", "{base} Flavoured Yogurt", "{adj} Cheese Slice",
        "{base} Cream Cheese", "{adj} Probiotic Curd", "{base} Ghee Premium",
        "Double Toned {adj} Milk", "{base} Butter Premium", "{adj} Shrikhand",
    ],
}

ADJECTIVES = [
    "Classic", "Premium", "Royal", "Traditional", "Homestyle", "Golden",
    "Spiced", "Roasted", "Organic", "Wholesome", "Artisan", "Heritage",
    "Farm Fresh", "Desi", "Rustic", "Supreme", "Grand", "Signature",
    "Special", "Deluxe", "Original", "Ancient Grain", "Millet",
    "High-Protein", "Low-Fat", "Sugar-Free", "Gluten-Free", "Vegan",
    "Keto-Friendly", "Masala", "Tandoori", "Hyderabadi", "Punjabi",
    "South Indian", "Gujarati", "Bengali", "Rajasthani", "Kashmiri",
    "Malabar", "Chettinad", "Lucknowi", "Goan", "Kolhapuri",
    "Mangalorean", "Konkan", "Awadhi", "Bihari", "Assamese",
    "Odia", "Sindhi", "Marwari", "Udupi", "Naga",
]

BASES = [
    "Oats", "Quinoa", "Almond", "Cashew", "Mango", "Banana",
    "Wheat", "Ragi", "Bajra", "Jowar", "Rice", "Coconut",
    "Turmeric", "Ginger", "Cardamom", "Saffron", "Jaggery",
    "Honey", "Peanut", "Sesame", "Flaxseed", "Chia",
    "Dates", "Fig", "Multigrain", "Lentil", "Chickpea",
    "Spinach", "Beetroot", "Carrot", "Amla", "Ashwagandha",
    "Paneer", "Ghee", "Curd", "Buttermilk", "Milk",
    "Moringa", "Tulsi", "Neem", "Spirulina", "Jackfruit",
    "Tamarind", "Kokum", "Pomegranate", "Guava", "Papaya",
]


class Command(BaseCommand):
    help = 'Seed sample recipes for ALL registered users (no demo user)'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=100,
                            help='Recipes per user (default: 100)')
        parser.add_argument('--clear', action='store_true',
                            help='Delete ALL existing seeded recipes before re-seeding')

    def handle(self, *args, **options):
        count = options['count']
        clear = options['clear']

        # Remove the old demo user if it exists
        demo = User.objects.filter(username='demo').first()
        if demo:
            demo_recipe_count = Recipe.objects.filter(user=demo).count()
            Recipe.objects.filter(user=demo).delete()
            demo.delete()
            self.stdout.write(self.style.WARNING(
                f"  Removed demo user and {demo_recipe_count} demo recipes."
            ))

        users = list(User.objects.filter(is_active=True))
        if not users:
            self.stdout.write(self.style.ERROR(
                "No registered users found. Create at least one user first."
            ))
            return

        all_ingredients = list(Ingredient.objects.all())
        if len(all_ingredients) < 5:
            self.stdout.write(self.style.ERROR(
                "Need at least 5 ingredients. Run seed_nutrition_db first."
            ))
            return

        if clear:
            deleted_count = Recipe.objects.all().count()
            Recipe.objects.all().delete()
            self.stdout.write(self.style.WARNING(
                f"  Cleared {deleted_count} existing recipes."
            ))

        total_created = 0

        for user in users:
            existing_names = set(
                Recipe.objects.filter(user=user).values_list('name', flat=True)
            )
            created_count = 0
            attempts = 0
            max_attempts = count * 5

            self.stdout.write(f"\nSeeding {count} recipes for '{user.username}'...")

            while created_count < count and attempts < max_attempts:
                attempts += 1
                category = random.choice(list(RECIPE_TEMPLATES.keys()))
                template = random.choice(RECIPE_TEMPLATES[category])
                adj = random.choice(ADJECTIVES)
                base = random.choice(BASES)
                name = template.format(adj=adj, base=base)

                if name in existing_names:
                    continue
                existing_names.add(name)

                brand = random.choice(BRANDS)
                manufacturer = random.choice(MANUFACTURERS)
                allergen = random.choice(ALLERGENS)
                serving_size = random.choice([25, 30, 35, 50, 75, 100, 150, 200, 250, 300])
                serving_unit = random.choice(['g', 'g', 'g', 'ml'])
                servings_per_pack = random.choice([1, 2, 3, 4, 5, 6, 8, 10])

                recipe = Recipe.objects.create(
                    user=user,
                    name=name,
                    description=f"A delicious {category.lower()} product from {brand}.",
                    serving_size=serving_size,
                    serving_unit=serving_unit,
                    servings_per_pack=servings_per_pack,
                    brand_name=brand,
                    manufacturer=manufacturer,
                    allergen_info=allergen,
                    fssai_license=f"{random.randint(10000000000000, 99999999999999)}",
                )

                num_ingredients = random.randint(3, 12)
                chosen = random.sample(
                    all_ingredients, min(num_ingredients, len(all_ingredients))
                )
                total_target = serving_size * servings_per_pack
                weights = [random.uniform(5, 100) for _ in chosen]
                weight_sum = sum(weights)
                scale = total_target / weight_sum if weight_sum > 0 else 1

                for ing, w in zip(chosen, weights):
                    RecipeIngredient.objects.create(
                        recipe=recipe,
                        ingredient=ing,
                        weight_grams=round(w * scale, 1),
                    )

                created_count += 1
                if created_count % 50 == 0:
                    self.stdout.write(f"  {created_count}/{count} recipes...")

            total_created += created_count
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {created_count} recipes for '{user.username}'"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {total_created} recipes across {len(users)} user(s)."
        ))
