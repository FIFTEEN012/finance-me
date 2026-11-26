# Finance Me

A personal finance app that also tracks everyday health (food, water, exercise) and household supplies, so money and wellbeing can be read together.

## Food and money

**Food Entry** (รายการอาหาร):
One thing eaten on a day, in a meal, with its calories and optionally protein, carbs and fat.
_Avoid_: Meal log, food log

**Meal** (มื้อ):
The slot a Food Entry belongs to: breakfast, lunch, dinner or snack.

**Food Category** (หมวดอาหาร):
An expense Category marked as food. "อาหาร" is one by default; the user may mark others (e.g. coffee).

**Food Expense** (รายจ่ายอาหาร):
An expense Transaction in a Food Category. One Food Expense may be linked to many Food Entries; a Food Entry is linked to at most one Food Expense, and either can exist without the other.
_Avoid_: Meal cost, food transaction

**Photo Draft** (ร่างจากรูป):
The Food Entries an AI suggests from a photo of food, which the user reviews and edits before any are saved.

## Water

**Water Target** (เป้าน้ำ):
The day's water goal, including the extra added for that day's exercise.

**Water Bottle** (ขวดน้ำ):
The picture of today's Water Target: a full bottle is the whole target.

## Exercise

**Move** (ท่า):
One exercise from the app's own curated library, with its recommended sets, reps or hold time, rest, and how to do it correctly.
_Avoid_: Exercise (ambiguous), pose

**Workout Session** (เซสชันออกกำลังกาย):
One bout of exercise on a day, of one Session Type, with its minutes and calories burned; it may also list the Moves done with their sets and reps. Every logged exercise is a Workout Session.
_Avoid_: Workout log, exercise entry, activity log

**Session Type** (ประเภทการออกกำลังกาย):
The kind of exercise a Workout Session is (running, cycling, strength, HIIT, stretching…), which sets how fast it burns calories.
_Avoid_: Activity

**Workout Plan** (แผนออกกำลังกาย):
The Moves, sets, reps and rest intended for a session, built for the user or by hand; finishing it logs a Workout Session.
_Avoid_: Routine, program

## Supplies

**Supply** (ของใช้):
One unit of a household product, from the day it was bought or opened until it is finished.

**Product** (สินค้า):
All Supplies sharing a name; its finished Supplies give the usual lifespan.

**Usual Lifespan** (อายุใช้งานปกติ):
The average days a Product's finished Supplies lasted; before any is finished, the user's own expected days stand in for it.

**Remaining** (ที่เหลือ):
How much of a Supply is estimated to be left: days in use against the Usual Lifespan, never below empty.

**Supply Shape** (รูปทรงของใช้):
The physical form a Supply is drawn as (bottle, tube, bag, box, roll, can, sachet), chosen from a fixed list.
