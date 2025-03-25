def sum_list(numbers)
 
  """Calculates the sum of a list of numbers."""
  total = 0
  for number in numbers:    total += number
  return total

my_list = [1, 2, 3, 4, 5]


list_sum = sum_list(my_list)
print(f"The sum of the list is: {list_sum}")

my_list_2 = [1, 2, '3', 4, 5]
list_sum_2 = sum_list(my_list_2)
print(f"The sum of the list is: {list_sum_2}
")